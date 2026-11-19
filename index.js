/**
 * Host half of the Taobao model-shopping adviser.
 *
 * It owns one browser bridge (a real Edge/Chrome window the user signs in to),
 * the locked model selection, the last search result set, and the deterministic
 * price/performance analysis. The Web panel and the agent tool both call the
 * same operations, so there is one implementation and one state.
 */
import { homedir } from 'node:os'
import { join, basename } from 'node:path'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'
import { Cdp } from './lib/cdp.js'
import { TaobaoBridge } from './lib/taobao.js'
import { analyze, buildReport, suggestQuestion } from './lib/analyze.js'
import { buildXlsx, readCsv, readXlsx } from './lib/xlsx.js'

export const name = '@local/dsh-taobao-advisor'

/**
 * The tool is the core capability: wait for the tool registry instead of racing
 * it at activation. The HTTP route waits for `webServer` on its own below.
 */
export const inject = ['tools']

const ROUTE_PATH = '/api/taobao-advisor'

/**
 * Single source of truth for the build id: the package version. The panel
 * compares its own copy with this one, so a page running a stale bundle offers
 * a reload (the desktop shell has no "Reload Page" menu).
 */
const BUILD = (() => {
  try {
    const manifest = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'))
    return String(manifest.version || '0.0.0')
  } catch {
    return '0.0.0'
  }
})()

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

function defaultProfileDir() {
  const base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
  return join(base, 'dsh-taobao-advisor', 'browser')
}

/**
 * Open a link in the user's own browser. The automation browser is headless, so
 * navigating it would look like "nothing happened".
 */
function openExternal(url) {
  if (!/^https:\/\/[\w.-]+\.(taobao|tmall)\.com\//i.test(url)) return false
  try {
    const child = process.platform === 'win32'
      ? spawn('cmd.exe', ['/c', 'start', '', url], { detached: true, stdio: 'ignore', windowsHide: true })
      : process.platform === 'darwin'
        ? spawn('open', [url], { detached: true, stdio: 'ignore' })
        : spawn('xdg-open', [url], { detached: true, stdio: 'ignore' })
    child.unref()
    return true
  } catch {
    return false
  }
}

export async function apply(ctx) {
  const cdp = new Cdp({ port: Number(process.env.DSH_TAOBAO_CDP_PORT || 9333), profileDir: defaultProfileDir() })
  const bridge = new TaobaoBridge({ cdp, logger: (line) => ctx.logger?.info?.(line) })

  /** Locked model and its result set. Kept until the user selects another model. */
  const state = { model: '', results: [], analysis: null, updatedAt: null, account: '' }
  ctx.effect(() => () => cdp.close(), 'taobao-advisor.browser')

  const operations = {
    async status() {
      const browser = await bridge.status()
      return {
        ...browser,
        build: BUILD,
        model: state.model,
        count: state.results.length,
        updatedAt: state.updatedAt,
        account: state.account,
        hasResults: state.results.length > 0,
      }
    },

    async login() {
      await bridge.openLogin()
      return { opened: true, hint: '已打开淘宝登录页：可以直接在面板里扫码或收短信，也可以在那个窗口里操作。' }
    },

    /** Live QR image for the panel. */
    async loginQr() {
      const result = await bridge.loginQr()
      if (!result.ok) return result
      return result
    },

    async loginState() {
      return bridge.loginState()
    },

    async switchAccount() {
      const result = await bridge.switchAccount()
      state.account = ''
      return { ...result, hint: '已退出当前登录，请重新扫码或使用短信/密码登录。' }
    },

    async smsStart(args) {
      const phone = String(args?.phone ?? '').replace(/[^\d]/g, '')
      if (!/^1\d{10}$/.test(phone)) return { ok: false, reason: '请输入 11 位手机号' }
      const result = await bridge.smsStart(phone)
      return result
    },

    async smsSubmit(args) {
      const code = String(args?.code ?? '').replace(/[^\d]/g, '')
      if (!/^\d{4,8}$/.test(code)) return { ok: false, reason: '请输入短信验证码' }
      const result = await bridge.smsSubmit(code)
      if (result.loggedIn) state.account = '短信登录'
      return result
    },

    async fillLogin(args) {
      const account = String(args?.account ?? '').trim()
      const password = String(args?.password ?? '')
      if (!account || !password) return { ok: false, reason: '请填写账号和密码' }
      state.account = account
      const result = await bridge.fillLogin(account, password)
      return {
        ...result,
        hint: result.ok
          ? '已把账号密码填进登录窗口并点击登录；如果出现滑块或短信验证，请在浏览器窗口里完成。'
          : result.reason,
      }
    },

    async search(args) {
      const query = String(args?.query ?? '').trim()
      if (!query) return { ok: false, reason: '请输入型号' }
      const limit = Math.min(60, Math.max(5, Number(args?.limit) || 40))
      const found = await bridge.search(query, { limit })
      if (found.blocked) {
        return {
          ok: false,
          needLogin: Boolean(found.needLogin),
          reason: found.reason || '没有拿到搜索结果',
          detail: found.info,
        }
      }
      const analysis = analyze(found.items, { model: query })
      state.model = query
      state.results = analysis.items
      state.analysis = analysis
      state.updatedAt = new Date().toISOString()
      return { ok: true, state: snapshot() }
    },

    async setModel(args) {
      const model = String(args?.model ?? '').trim()
      if (!model) return { ok: false, reason: '型号不能为空' }
      if (model === state.model) return { ok: true, state: snapshot() }
      state.model = model
      state.results = []
      state.analysis = null
      state.updatedAt = new Date().toISOString()
      return { ok: true, state: snapshot() }
    },

    async clearModel() {
      state.model = ''
      state.results = []
      state.analysis = null
      state.updatedAt = null
      return { ok: true, state: snapshot() }
    },

    async detail(args) {
      const url = String(args?.url ?? '')
      if (!/^https?:\/\//.test(url)) return { ok: false, reason: '链接无效' }
      return { ok: true, detail: await bridge.detail(url) }
    },

    async askSeller(args) {
      const url = String(args?.url ?? '')
      if (!/^https?:\/\//.test(url)) return { ok: false, reason: '链接无效' }
      const item = state.results.find((entry) => entry.url === url)
      const question = String(args?.question ?? '').trim() || (item ? suggestQuestion(state.model, item) : '')
      if (!question) return { ok: false, reason: '没有可发送的问题' }
      const result = await bridge.askSeller(url, question)
      return { ok: true, question, ...result }
    },

    async openItem(args) {
      const url = String(args?.url ?? '')
      if (!/^https?:\/\//.test(url)) return { ok: false, reason: '链接无效' }
      if (openExternal(url)) return { ok: true, external: true }
      // Fallback: drive the automation browser and bring it on screen.
      await bridge.openItem(url)
      return { ok: true, external: false, reason: '已用后台浏览器打开，如果没有窗口请点“显示浏览器”' }
    },

    async revealExports() {
      const dir = exportDir()
      try {
        if (process.platform === 'win32') spawn('explorer.exe', [dir], { detached: true, stdio: 'ignore' }).unref()
        else if (process.platform === 'darwin') spawn('open', [dir], { detached: true, stdio: 'ignore' }).unref()
        else spawn('xdg-open', [dir], { detached: true, stdio: 'ignore' }).unref()
        return { ok: true, dir }
      } catch (error) {
        return { ok: false, reason: String(error?.message || error), dir }
      }
    },

    /** Switch the automation browser between hidden (default) and visible. */
    async showBrowser(args) {
      const visible = args?.visible !== false
      const current = await cdp.evaluate('location.href').catch(() => '')
      await cdp.shutdown()
      cdp.headless = !visible
      await cdp.connect()
      if (current && /^https?:/.test(String(current))) await cdp.navigate(String(current)).catch(() => {})
      if (visible) await cdp.bringToFront()
      return { ok: true, visible, hint: visible ? '已显示浏览器窗口，可以在里面处理滑块或验证码。' : '浏览器已切回后台运行。' }
    },

    async parseSheet(args) {
      const name = String(args?.name || '')
      const base64 = String(args?.data || '')
      if (!base64) return { ok: false, reason: '没有收到文件内容' }
      const bytes = Buffer.from(base64, 'base64')
      let matrix
      if (/\.csv$/i.test(name)) matrix = readCsv(bytes.toString('utf8'))
      else matrix = readXlsx(bytes)
      const rows = parseDemandRows(matrix)
      if (rows.length === 0) return { ok: false, reason: '没有读到有效行（需要一列“品名/型号”）', preview: matrix.slice(0, 5) }
      return { ok: true, rows, preview: matrix.slice(0, 6) }
    },

    async batchStart(args) {
      if (batch.running) return { ok: false, reason: '已经有一批任务在跑，请等它结束' }
      const rows = Array.isArray(args?.rows) ? args.rows : []
      if (rows.length === 0) return { ok: false, reason: '没有要比价的行' }
      if (rows.length > 30) return { ok: false, reason: '一次最多 30 行，请分两批' }
      const normalized = rows.map((row, index) => ({
        no: Number(row?.no) || index + 1,
        name: String(row?.name || '').trim(),
        spec: String(row?.spec || '').trim(),
        budget: Number(row?.budget) || 0,
        qty: Number(row?.qty) || 1,
        note: String(row?.note || '').trim(),
      })).filter((row) => row.name)
      if (normalized.length === 0) return { ok: false, reason: '没有有效的型号' }
      runBatch(normalized).catch(() => {})
      return { ok: true, batch: batchView() }
    },

    async batchStatus() {
      return { ok: true, batch: batchView() }
    },
  }

  const snapshot = () => ({
    model: state.model,
    count: state.results.length,
    updatedAt: state.updatedAt,
    analysis: state.analysis,
  })

  async function dispatch(method, args) {
    const handler = operations[method]
    if (!handler) return { ok: false, reason: `未知操作 ${method}` }
    try {
      return await handler(args)
    } catch (error) {
      return { ok: false, reason: String(error?.message || error), error: true }
    }
  }

  /* -------------------------------- batch run ------------------------------- */

  const stamp = () => {
    const d = new Date()
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`
  }

  const exportDir = () => {
    const base = process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    const dir = join(base, 'dsh-taobao-advisor', 'exports')
    try {
      mkdirSync(dir, { recursive: true })
      return dir
    } catch {
      return base
    }
  }

  const batch = {
    id: '', running: false, total: 0, done: 0, current: '', error: '', file: '', rows: [], results: [],
  }

  const rowPick = (row, analysis) => {
    // Only the pool: accessories, installments, bait prices and cross-model hits are already gone.
    const pool = Array.isArray(analysis.pool) && analysis.pool.length ? analysis.pool : analysis.items
    const within = row.budget > 0 ? pool.filter((item) => item.price <= row.budget) : pool
    const use = within.length ? within : pool
    const cheapest = [...use].sort((a, b) => a.price - b.price)[0]
    const value = [...use].sort((a, b) => b.value - a.value)[0]
    const performance = [...use].sort((a, b) => (b.performance - a.performance) || (a.price - b.price))[0]
    return { cheapest, value, performance, overBudget: row.budget > 0 && within.length === 0 }
  }

  const writeBatch = (results) => {
    const summary = [[
      '序号', '需求', '规格', '预算', '数量', '最便宜', '价格', '最便宜链接',
      '性价比最高', '价格', '性价比链接', '性能最强', '价格', '性能链接',
      '可比价数', '结论/备注',
    ]]
    const detail = [['序号', '需求', '品牌', '标题', '价格', '销量', '店铺', '发货地', '标签', '链接']]

    for (const entry of results) {
      const row = entry.row
      if (!entry.analysis) {
        summary.push([row.no, row.name, row.spec, row.budget || '', row.qty, '', '', '', '', '', '', '', '', '', '', `失败：${entry.error}`])
        continue
      }
      const picks = rowPick(row, entry.analysis)
      const note = picks.overBudget ? `预算 ¥${row.budget} 内没有合适报价` : entry.analysis.decision
      summary.push([
        row.no, row.name, row.spec, row.budget || '', row.qty,
        picks.cheapest?.title ?? '', picks.cheapest?.price ?? '', picks.cheapest?.url ?? '',
        picks.value?.title ?? '', picks.value?.price ?? '', picks.value?.url ?? '',
        picks.performance?.title ?? '', picks.performance?.price ?? '', picks.performance?.url ?? '',
        entry.analysis.stats.count, note,
      ])
      for (const item of entry.analysis.items) {
        const flags = item.flags || {}
        const tags = [
          flags.accessory ? '配件' : '', flags.installment ? '分期' : '',
          flags.risk ? '二手' : '', flags.grey ? '水货' : '', item.tmall ? '天猫' : '',
        ].filter(Boolean).join('/')
        detail.push([row.no, row.name, item.brand || '', item.title, item.price, item.sales || 0, item.shop || '', item.location || '', tags, item.url])
      }
    }

    const buffer = buildXlsx([
      { name: '汇总', rows: summary, widths: [6, 22, 16, 8, 6, 34, 9, 42, 34, 9, 42, 34, 9, 42, 9, 40] },
      { name: '全部链接', rows: detail, widths: [6, 20, 10, 46, 9, 9, 22, 8, 12, 42] },
    ])
    const file = `淘宝批量比价-${stamp()}.xlsx`
    const path = join(exportDir(), file)
    writeFileSync(path, buffer)
    return { file, path }
  }

  async function runBatch(rows) {
    batch.id = String(Date.now())
    batch.running = true
    batch.total = rows.length
    batch.done = 0
    batch.current = ''
    batch.error = ''
    batch.file = ''
    batch.results = []
    batch.rows = rows
    try {
      for (const row of rows) {
        batch.current = row.name
        const query = [row.name, row.spec].filter(Boolean).join(' ')
        const entry = { row, analysis: null, error: '' }
        try {
          const found = await bridge.search(query, { limit: 40 })
          if (found.blocked) entry.error = found.needLogin ? '淘宝要求先登录' : (found.reason || '没有拿到结果')
          else entry.analysis = analyze(found.items, { model: row.name })
        } catch (error) {
          entry.error = String(error?.message || error)
        }
        batch.results.push(entry)
        batch.done += 1
        await sleep(1200 + Math.round(Math.random() * 1200))
      }
      const written = writeBatch(batch.results)
      batch.file = written.file
      batch.path = written.path
    } catch (error) {
      batch.error = String(error?.message || error)
    } finally {
      batch.running = false
      batch.current = ''
    }
  }

  const batchView = () => ({
    id: batch.id,
    running: batch.running,
    total: batch.total,
    done: batch.done,
    current: batch.current,
    file: batch.file,
    path: batch.path || '',
    error: batch.error,
  })

  const parseDemandRows = (matrix) => {
    const rows = (matrix || []).filter((row) => Array.isArray(row) && row.some((cell) => String(cell ?? '').trim() !== ''))
    if (rows.length === 0) return []
    const header = rows[0].map((cell) => String(cell ?? '').trim())
    const find = (...keys) => header.findIndex((title) => keys.some((key) => title.includes(key)))
    const cols = {
      name: find('型号', '品名', '商品', '名称'),
      spec: find('规格', '配置'),
      budget: find('预算'),
      qty: find('数量'),
      note: find('备注'),
    }
    const hasHeader = cols.name >= 0
    const body = hasHeader ? rows.slice(1) : rows
    const cell = (row, index) => (index >= 0 ? String(row[index] ?? '').trim() : '')
    return body.map((row, index) => ({
      no: index + 1,
      name: cell(row, cols.name) || String(row[0] ?? '').trim(),
      spec: cell(row, cols.spec),
      budget: Number(cell(row, cols.budget).replace(/[^\d.]/g, '')) || 0,
      qty: Number(cell(row, cols.qty).replace(/[^\d]/g, '')) || 1,
      note: cell(row, cols.note),
    })).filter((row) => row.name)
  }

  const templateRows = () => [
    ['序号', '品名/型号（必填）', '关键规格', '预算上限', '数量', '备注'],
    [1, 'iPhone 17 Pro', '256G 国行', 8000, 1, '只看全新正品'],
    [2, '小米15', '12+512G', 4500, 1, ''],
    [3, 'RTX 5070 Ti 显卡', '16G 非公版', 7000, 1, ''],
  ]

  /* ------------------------------- Web panel API ------------------------------- */

  const readJson = async (req) => {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += chunk.length
      if (size > 1024 * 1024) throw new Error('请求体过大')
      chunks.push(chunk)
    }
    if (size === 0) return {}
    return JSON.parse(Buffer.concat(chunks).toString('utf8'))
  }

  /** Serve a product photo through our own origin so page CSP or hotlink rules cannot block it. */
  const proxyImage = async (target, res) => {
    if (!/^https:\/\/[\w.-]+\.(alicdn|taobao|tmall)\.com\//i.test(target)) {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end('bad image url')
    }
    try {
      const upstream = await fetch(target, {
        headers: { 'user-agent': 'Mozilla/5.0', referer: 'https://item.taobao.com/' },
        signal: AbortSignal.timeout(15000),
      })
      if (!upstream.ok) {
        res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
        return res.end(`upstream ${upstream.status}`)
      }
      const buffer = Buffer.from(await upstream.arrayBuffer())
      res.writeHead(200, {
        'content-type': upstream.headers.get('content-type') || 'image/jpeg',
        'cache-control': 'public, max-age=86400',
        'content-length': String(buffer.length),
      })
      return res.end(buffer)
    } catch (error) {
      res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' })
      return res.end(String(error?.message || error))
    }
  }

  ctx.inject(['webServer'], (scope) => {
    scope.effect(() => scope.webServer.register({
      kind: 'prefix',
      path: ROUTE_PATH,
      handler: async (req, res) => {
        const send = (value, status = 200) => {
          res.writeHead(status, {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': 'no-store',
          })
          res.end(JSON.stringify(value))
        }
        try {
          if (req.method === 'GET') {
            const parsed = new URL(req.url || '/', 'http://127.0.0.1')
            const imageUrl = parsed.searchParams.get('img')
            if (imageUrl) return await proxyImage(imageUrl, res)
            if (parsed.searchParams.get('template')) {
              const buffer = buildXlsx([{ name: '比价需求', rows: templateRows(), widths: [6, 26, 18, 10, 8, 24] }])
              res.writeHead(200, {
                'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'content-disposition': `attachment; filename="taobao-batch-template.xlsx"; filename*=UTF-8''${encodeURIComponent('淘宝批量比价-模板.xlsx')}`,
                'content-length': String(buffer.length),
              })
              return res.end(buffer)
            }
            const requested = parsed.searchParams.get('file')
            if (requested) {
              const safe = basename(String(requested))
              const filePath = join(exportDir(), safe)
              if (!existsSync(filePath)) {
                res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
                return res.end('not found')
              }
              const buffer = readFileSync(filePath)
              res.writeHead(200, {
                'content-type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'content-disposition': `attachment; filename="export.xlsx"; filename*=UTF-8''${encodeURIComponent(safe)}`,
                'content-length': String(buffer.length),
              })
              return res.end(buffer)
            }
            return send({ ok: true, state: snapshot(), status: await operations.status(), batch: batchView() })
          }
          if (req.method !== 'POST') {
            res.setHeader('allow', 'GET, POST')
            return send({ ok: false, reason: 'method not allowed' }, 405)
          }
          const body = await readJson(req)
          const method = String(body?.method || '')
          if (method === 'status') return send({ ok: true, state: snapshot(), status: await operations.status() })
          return send(await dispatch(method, body?.args ?? {}))
        } catch (error) {
          return send({ ok: false, reason: String(error?.message || error) }, 500)
        }
      },
    }), 'taobao-advisor.route')
  })

  /* --------------------------------- agent tool -------------------------------- */

  const tools = ctx.get?.('tools')
  if (tools) {
    ctx.effect(() => tools.register({
      name: 'taobao_adviser',
      description: '在用户已登录的淘宝页面上搜索商品型号、比较价格/性价比/性能，并可以代用户向卖家客服提问。'
        + ' action=status 查看浏览器与登录状态；action=login 打开登录窗口让用户扫码；'
        + ' action=search 用型号搜索并锁定该型号（会返回最便宜/性价比/性能推荐与商品链接）；'
        + ' action=ask_seller 到指定商品页联系客服并发送问题；action=open 在浏览器打开链接。',
      parameters: {
        type: 'object',
        additionalProperties: false,
        properties: {
          action: {
            type: 'string',
            enum: ['status', 'login', 'search', 'ask_seller', 'open'],
            description: '要执行的操作。',
          },
          query: { type: 'string', description: 'search 时的型号或关键词，例如「iPhone 17 Pro 256G」。' },
          url: { type: 'string', description: 'ask_seller / open 时的商品链接。' },
          question: { type: 'string', description: 'ask_seller 时要发给客服的问题；省略则自动生成。' },
          limit: { type: 'integer', description: 'search 返回的最多商品数，默认 40。' },
        },
        required: ['action'],
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
            text: { type: 'string' },
          },
        },
        render(args, value) {
          return [{ type: 'text', text: String(value?.text ?? '') }]
        },
      },
      timeoutMs: 180000,
      async execute(args) {
        const action = String(args?.action || '')
        if (action === 'status') {
          const status = await operations.status()
          const text = status.loggedIn
            ? `浏览器已就绪，淘宝已登录${status.nick ? `（${status.nick}）` : ''}。当前锁定型号：${status.model || '未选择'}。`
            : `浏览器${status.browser ? '已启动' : '未启动'}，淘宝尚未登录。可以执行 action=login 打开登录窗口让用户扫码。`
          return { ok: true, text, status }
        }
        if (action === 'login') {
          const result = await operations.login()
          return { ok: true, text: result.hint }
        }
        if (action === 'search') {
          const result = await operations.search({ query: args?.query, limit: args?.limit })
          if (!result.ok) {
            const text = result.needLogin
              ? `淘宝要求登录后才能搜索。请先执行 action=login 打开登录窗口，让用户用手机淘宝扫码登录，然后再搜索。`
              : `搜索失败：${result.reason}`
            return { ok: false, text, needLogin: Boolean(result.needLogin) }
          }
          const analysis = result.state.analysis
          return { ok: true, text: buildReport(analysis), model: analysis.model, picks: analysis.picks, items: analysis.items.slice(0, 20), stats: analysis.stats }
        }
        if (action === 'ask_seller') {
          const result = await operations.askSeller({ url: args?.url, question: args?.question })
          if (!result.ok) return { ok: false, text: String(result.reason || '发送失败') }
          const steps = (result.steps || []).map((step) => `${step.step}: ${step.ok === false || step.found === false ? '失败' : '完成'}`).join('；')
          return { ok: Boolean(result.sent), text: `${result.note}\n问题：${result.question}\n执行轨迹：${steps}` }
        }
        if (action === 'open') {
          const result = await operations.openItem({ url: args?.url })
          return { ok: Boolean(result.ok), text: result.ok ? '已在浏览器打开该链接。' : String(result.reason) }
        }
        return { ok: false, text: `未知操作：${action}` }
      },
      presentCall(args) {
        return { card: 'generic', title: `淘宝选型：${args?.action ?? ''}`, kind: 'search', rawInput: args }
      },
    }), 'taobao-advisor.tool')
  }

}
