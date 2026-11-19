/**
 * Minimal Chrome DevTools Protocol client used by the Taobao advisor plugin.
 * Only dependency: Node's built-in global WebSocket (Node >= 22).
 */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const WIN_BROWSERS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
]

function resolveBrowser(preferred) {
  if (preferred && existsSync(preferred)) return preferred
  for (const candidate of WIN_BROWSERS) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

export class Cdp {
  constructor(options = {}) {
    this.port = options.port ?? 9333
    this.profileDir = options.profileDir
    this.executable = resolveBrowser(options.executable)
    this.headless = options.headless !== false
    this.ws = null
    this.sessionId = null
    this.targetId = null
    this.nextId = 0
    this.pending = new Map()
    this.log = []
  }

  base() {
    return `http://127.0.0.1:${this.port}`
  }

  async version() {
    try {
      const response = await fetch(`${this.base()}/json/version`, { signal: AbortSignal.timeout(1500) })
      if (!response.ok) return null
      return await response.json()
    } catch {
      return null
    }
  }

  async launch() {
    const version = await this.version()
    if (version) return version
    if (!this.executable) {
      throw new Error('未找到 Microsoft Edge 或 Chrome，无法打开淘宝登录窗口。请在插件配置中设置 executable 指向浏览器路径。')
    }
    if (this.profileDir) mkdirSync(this.profileDir, { recursive: true })
    const args = [
      `--remote-debugging-port=${this.port}`,
      '--remote-allow-origins=*',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
      '--disable-backgrounding-occluded-windows',
      '--disable-renderer-backgrounding',
      '--disable-blink-features=AutomationControlled',
      '--lang=zh-CN',
    ]
    if (this.headless) {
      // Headless keeps the whole run off screen; the QR code still renders for capture.
      args.push('--headless=new', '--window-size=1440,1000', '--mute-audio')
      args.push(`--user-agent=${this.userAgent()}`)
    } else {
      args.push('--window-size=1440,1000', '--window-position=80,60')
    }
    if (this.profileDir) args.push(`--user-data-dir=${this.profileDir}`)
    args.push('about:blank')
    const child = spawn(this.executable, args, { detached: true, stdio: 'ignore' })
    child.unref()
    for (let i = 0; i < 80; i++) {
      await sleep(250)
      const ready = await this.version()
      if (ready) return ready
    }
    throw new Error('浏览器已启动，但调试端口没有响应（可能被安全软件拦截）。')
  }

  /** A plain desktop Edge UA, so headless does not advertise itself. */
  userAgent() {
    return 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/157.0.0.0 Safari/537.36 Edge/157.0.0.0'
  }

  /** Ask the browser to exit; used when switching between hidden and visible mode. */
  async shutdown() {
    try {
      if (this.ws) await this.send('Browser.close', {}, undefined)
    } catch { /* already gone */ }
    this.close()
    for (let i = 0; i < 40; i++) {
      await sleep(150)
      const alive = await this.version()
      if (!alive) return true
    }
    return false
  }

  async connect() {
    const version = await this.launch()
    // A browser restart keeps the port but drops every target: reuse only a live socket.
    if (this.ws && this.ws.readyState === 1 && this.sessionId) return version
    this.close()
    const ws = new WebSocket(version.webSocketDebuggerUrl)
    this.ws = ws
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('连接浏览器调试端口超时')), 8000)
      ws.onopen = () => { clearTimeout(timer); resolve() }
      ws.onerror = (event) => { clearTimeout(timer); reject(new Error(`连接调试端口失败: ${event?.message ?? ''}`)) }
    })
    ws.onmessage = (event) => {
      let message
      try { message = JSON.parse(event.data) } catch { return }
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id)
        this.pending.delete(message.id)
        if (message.error) reject(new Error(`${message.error.message} (${message.error.code})`))
        else resolve(message.result)
      }
    }
    ws.onclose = () => {
      this.ws = null
      this.sessionId = null
      for (const [id, entry] of this.pending) {
        this.pending.delete(id)
        entry.reject(new Error('浏览器连接已断开'))
      }
    }
    await this.attach()
    return version
  }

  /** True for the errors a stale target/session produces. */
  static isStaleSession(error) {
    return /Session with given id|No target with given id|Target closed|Not attached|Cannot find context|Inspected target navigated/i
      .test(String(error?.message || error))
  }

  /** Run one CDP interaction, re-attaching once if the session went stale. */
  async withSessionRetry(operation) {
    try {
      return await operation()
    } catch (error) {
      if (!Cdp.isStaleSession(error)) throw error
      this.close()
      await this.connect()
      return await operation()
    }
  }

  send(method, params = {}, sessionId = this.sessionId || undefined) {
    if (!this.ws) throw new Error('浏览器未连接')
    const id = ++this.nextId
    const message = { id, method, params }
    if (typeof sessionId === 'string') message.sessionId = sessionId
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        if (this.pending.delete(id)) reject(new Error(`CDP ${method} 超时`))
      }, 60000)
      const settle = (fn) => (value) => { clearTimeout(timer); fn(value) }
      this.pending.set(id, { resolve: settle(resolve), reject: settle(reject) })
      this.ws.send(JSON.stringify(message))
    })
  }

  async attach() {
    const { targetInfos } = await this.send('Target.getTargets', {}, undefined)
    const existing = (targetInfos || []).find((target) => target.type === 'page')
    if (existing) {
      this.targetId = existing.targetId
    } else {
      const created = await this.send('Target.createTarget', { url: 'about:blank' }, undefined)
      this.targetId = created.targetId
    }
    const attached = await this.send('Target.attachToTarget', { targetId: this.targetId, flatten: true }, undefined)
    this.sessionId = attached.sessionId
    await this.send('Page.enable')
    await this.send('Runtime.enable')
    await this.send('Emulation.setDeviceMetricsOverride', {
      width: 1440, height: 900, deviceScaleFactor: 1, mobile: false,
    }).catch(() => {})
  }

  async bringToFront() {
    try {
      if (this.targetId) await this.send('Target.activateTarget', { targetId: this.targetId }, undefined)
    } catch { /* window activation is best effort */ }
  }

  async evaluate(expression, { awaitPromise = true } = {}) {
    const result = await this.withSessionRetry(() => this.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise,
      userGesture: true,
    }))
    if (result.exceptionDetails) {
      throw new Error(result.exceptionDetails.exception?.description || '页面脚本执行失败')
    }
    return result.result?.value
  }

  async navigate(url, { timeoutMs = 25000 } = {}) {
    await this.withSessionRetry(() => this.send('Page.navigate', { url }))
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      await sleep(300)
      try {
        const state = await this.evaluate('document.readyState')
        if (state === 'complete') return true
      } catch { /* navigating destroys the context; retry */ }
    }
    return false
  }

  async waitFor(expression, { timeoutMs = 20000, intervalMs = 400 } = {}) {
    const deadline = Date.now() + timeoutMs
    while (Date.now() < deadline) {
      try {
        const value = await this.evaluate(expression)
        if (value) return value
      } catch { /* context swap */ }
      await sleep(intervalMs)
    }
    return null
  }

  close() {
    try { this.ws?.close() } catch { /* ignore */ }
    this.ws = null
    this.sessionId = null
  }
}

export { resolveBrowser }
