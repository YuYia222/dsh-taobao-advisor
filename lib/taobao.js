/**
 * Taobao operations driven through a real, user-signed-in browser (CDP).
 * No credentials are stored here: the browser profile keeps the session.
 */
import { setTimeout as sleep } from 'node:timers/promises'

const SEARCH_URL = (query) => `https://s.taobao.com/search?q=${encodeURIComponent(query)}`

/* ----------------------------- page-side functions ----------------------------- */

function pageExtractItems() {
  const priceOf = (card) => {
    const int = card.querySelector('[class*="priceInt"], [class*="Price--priceInt"]')
    const dec = card.querySelector('[class*="priceDecimal"], [class*="Price--priceDecimal"]')
    if (int) {
      const integer = (int.textContent || '').replace(/[^\d]/g, '')
      const decimals = dec ? (dec.textContent || '').replace(/[^\d]/g, '') : ''
      if (integer) return Number(decimals ? `${integer}.${decimals}` : integer)
    }
    const text = card.innerText || ''
    const match = text.match(/[¥￥]\s*([\d,]+(?:\.\d+)?)/)
    if (match) return Number(match[1].replace(/,/g, ''))
    const bare = text.match(/(?:^|\n)\s*([\d,]{2,9}(?:\.\d{1,2})?)\s*(?:\n|$)/)
    return bare ? Number(bare[1].replace(/,/g, '')) : 0
  }

  const salesOf = (text) => {
    const match = text.match(/([\d.]+万?)\+?\s*人(?:付款|收货|已买)/)
    if (!match) return { text: '', value: 0 }
    const raw = match[1]
    const value = raw.includes('万') ? Math.round(Number(raw.replace('万', '')) * 10000) : Number(raw)
    return { text: `${raw}人付款`, value }
  }

  const results = []
  const seen = new Set()
  const anchors = Array.from(document.querySelectorAll('a[href*="/item.htm"], a[href*="detail.tmall.com/item.htm"]'))
  for (const anchor of anchors) {
    const href = anchor.href || ''
    const idMatch = href.match(/[?&]id=(\d{6,})/)
    if (!idMatch) continue
    const id = idMatch[1]
    if (seen.has(id)) continue
    // Climb to this product's own card, never into a wrapper that holds siblings:
    // a shared wrapper would give us the neighbouring item's price.
    const productLinks = (node) => (node ? node.querySelectorAll('a[href*="/item.htm"], a[href*="detail.tmall.com/item.htm"]').length : 0)
    let card = anchor
    for (let depth = 0; depth < 12; depth += 1) {
      const parent = card.parentElement
      if (!parent) break
      if (productLinks(parent) > 1) break
      card = parent
      const text = card.innerText || ''
      if (text.length > 30 && /[¥￥]\s*\d/.test(text)) break
    }
    const text = card.innerText || ''
    if (!/[¥￥]\s*\d/.test(text)) continue
    seen.add(id)
    const titleEl = card.querySelector('[class*="Title--title"], [class*="title"], [class*="ItemTitle"]')
    const shopEl = card.querySelector('[class*="ShopInfo--shopName"], [class*="shopName"], [class*="shop-name"]')
    const locationEl = card.querySelector('[class*="procity"], [class*="location"], [class*="Location"]')
    const imgEl = card.querySelector('img')
    const title = (titleEl?.innerText || anchor.getAttribute('title') || imgEl?.alt || '').trim().slice(0, 200)
    if (!title) continue
    const rawImage = imgEl
      ? (imgEl.currentSrc || imgEl.src || imgEl.getAttribute('data-src') || imgEl.getAttribute('data-ks-lazyload') || '')
      : ''
    let image = String(rawImage).trim()
    if (image.startsWith('//')) image = `https:${image}`
    if (!/^https?:\/\//.test(image)) image = ''
    // Lazy placeholders and sprites are not product photos.
    if (/\.(svg|gif)(\?|$)/i.test(image) || image.length < 12) image = ''
    const sales = salesOf(text)
    const shopLines = (shopEl?.innerText || '').split('\n').map((line) => line.trim()).filter(Boolean)
    results.push({
      id,
      title,
      price: priceOf(card),
      salesText: sales.text,
      sales: sales.value,
      shop: (shopLines[shopLines.length - 1] || '').slice(0, 60),
      location: (locationEl?.innerText || '').trim().slice(0, 30),
      url: `https://item.taobao.com/item.htm?id=${id}`,
      tmall: /tmall\.com/.test(href),
      image: image.slice(0, 600),
    })
  }
  return results
}

function pageLoginState() {
  const cookie = document.cookie || ''
  const hasSessionCookie = /(^|;\s*)(tracknick|_l_g_|cookie2|_nk_)=/.test(cookie)
  const text = document.body ? document.body.innerText : ''
  const promptLogin = /亲，请登录|请登录后|登录后查看/.test(text)
  const nickEl = document.querySelector('[class*="site-nav-login-info-nick"], [class*="login-info-nick"], .site-nav-user')
  return {
    hasSessionCookie,
    promptLogin,
    nick: (nickEl?.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 40),
    url: location.href,
  }
}

function pageFillLogin(account, password) {
  const nativeSet = (element, value) => {
    const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
    if (setter) setter.call(element, value)
    else element.value = value
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  }
  const accountInput = document.querySelector('#fm-login-id, input[name="fm-login-id"], input[placeholder*="账号"], input[placeholder*="手机号"]')
  const passwordInput = document.querySelector('#fm-login-password, input[name="fm-login-password"], input[type="password"], input[placeholder*="密码"]')
  if (!accountInput || !passwordInput) {
    return { ok: false, reason: '没有找到登录表单（页面可能还不是登录状态页）' }
  }
  nativeSet(accountInput, account)
  nativeSet(passwordInput, password)
  const submit = document.querySelector('#login-submit, button[type="submit"], .fm-button, [class*="login-submit"], [class*="LoginSubmit"]')
  if (submit) {
    submit.click()
    return { ok: true, clicked: true, text: (submit.innerText || '').trim().slice(0, 20) }
  }
  return { ok: true, clicked: false }
}

function pagePunish() {
  const url = String(location.href)
  const text = document.body ? document.body.innerText : ''
  const hit = /访问异常提示|访问存在异常|系统检测到当前访问|安全验证|滑动验证|请按住滑块|完成验证|为保障您的账户安全/.test(text)
  if (/_____tmd_____|punish\b|captcha/i.test(url) || hit) {
    return { punished: true, url, sample: text.replace(/\s+/g, ' ').slice(0, 120) }
  }
  return { punished: false, url }
}

function pagePageInfo() {
  const text = document.body ? document.body.innerText : ''
  return {
    url: location.href,
    title: document.title,
    snippet: text.replace(/\s+/g, ' ').slice(0, 400),
    itemLinks: document.querySelectorAll('a[href*="/item.htm"]').length,
  }
}

function pageLoginStage() {
  const text = document.body ? document.body.innerText : ''
  const cookie = document.cookie || ''
  const loggedIn = /(^|;\s*)(tracknick|_l_g_|cookie2|_nk_)=/.test(cookie) && !/亲，请登录/.test(text)
  const qrBlock = document.querySelector('.qrcode-login')
  const qrText = qrBlock ? qrBlock.innerText || '' : ''
  let stage = 'qr'
  if (/扫描成功|请在手机上确认/.test(qrText)) stage = 'scanned'
  else if (/二维码.*(失效|过期)|已失效|点击刷新/.test(qrText)) stage = 'expired'
  else if (!qrBlock) stage = /扫码登录/.test(text) ? 'qr' : 'other'
  return { loggedIn, stage, url: location.href }
}

function pageQrRect() {
  const canvas = document.querySelector('.qrcode-img canvas, .qrcode-login canvas, .qrcode-login img, canvas')
  if (!canvas) return null
  const rect = canvas.getBoundingClientRect()
  if (!rect.width || !rect.height) return null
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
}

function pageNativeSet(selector, value) {
  const element = document.querySelector(selector)
  if (!element) return false
  const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (setter) setter.call(element, value)
  else element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  return true
}

function pageLoginSetup(mode) {
  // mode: 'sms' | 'password'
  const tabs = Array.from(document.querySelectorAll('.sms-login-tab-item, .password-login-tab-item, [class*="login-tab-item"]'))
  const wanted = mode === 'sms' ? '短信登录' : '密码登录'
  const tab = tabs.find((node) => (node.innerText || '').trim() === wanted)
  if (tab) tab.click()
  const agree = document.querySelector('#fm-agreement-checkbox, input[type="checkbox"]')
  if (agree && !agree.checked) agree.click()
  return Boolean(tab)
}

function pageClickText(candidates) {
  const nodes = Array.from(document.querySelectorAll('a, button, div, span'))
  const hit = nodes.find((node) => {
    const text = (node.innerText || '').trim()
    return text.length > 0 && text.length < 14 && candidates.includes(text)
  })
  if (!hit) return false
  hit.click()
  return true
}

function pageClickSubmit() {
  const button = document.querySelector('button.fm-submit, .fm-button, button[type="submit"]')
  if (!button) return false
  button.click()
  return true
}

function pageCaptchaVisible() {
  return Boolean(document.querySelector('#baxia-dialog-content, .nc-container, [class*="nc_iconfont"], iframe[src*="captcha"], iframe[src*="punish"]'))
}

function pageLoginErrors() {
  const nodes = Array.from(document.querySelectorAll('[class*="error"], .fm-error, [class*="tip"]'))
  const texts = nodes.map((node) => (node.innerText || '').trim()).filter((text) => text.length > 2 && text.length < 60)
  return texts.slice(0, 4)
}

function pageFindSupportEntry() {
  const nodes = Array.from(document.querySelectorAll('a, button, span, div'))
  const hit = nodes.find((node) => {
    const text = (node.innerText || '').trim()
    return text.length > 0 && text.length < 12 && /^(联系客服|客服|阿里旺旺|旺旺|联系卖家)$/.test(text)
  })
  if (!hit) return { found: false }
  hit.click()
  return { found: true, label: (hit.innerText || '').trim() }
}

function pageTypeIntoChat(message) {
  const editable = document.querySelector('textarea, [contenteditable="true"]')
  if (!editable) return { ok: false, reason: '没有找到聊天输入框' }
  if (editable.tagName === 'TEXTAREA') {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set
    if (setter) setter.call(editable, message)
    else editable.value = message
    editable.dispatchEvent(new Event('input', { bubbles: true }))
  } else {
    editable.focus()
    editable.innerText = message
    editable.dispatchEvent(new InputEvent('input', { bubbles: true, data: message }))
  }
  const sendButton = Array.from(document.querySelectorAll('button, a, div')).find((node) =>
    /^(发送|Send)$/.test((node.innerText || '').trim()))
  if (sendButton) { sendButton.click(); return { ok: true, sent: true } }
  editable.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true }))
  return { ok: true, sent: true, viaEnter: true }
}

/* --------------------------------- bridge --------------------------------- */

export class TaobaoBridge {
  constructor({ cdp, logger = () => {} }) {
    this.cdp = cdp
    this.logger = logger
  }

  async ensure() {
    return this.cdp.connect()
  }

  page(fn, ...args) {
    const source = `(${fn.toString()})(${args.map((arg) => JSON.stringify(arg)).join(',')})`
    return this.cdp.evaluate(source)
  }

  async status() {
    try {
      const version = await this.cdp.version()
      if (!version) {
        return { browser: false, loggedIn: false, note: '浏览器未启动' }
      }
      await this.ensure()
      let url = String(await this.cdp.evaluate('location.href').catch(() => 'about:blank'))
      if (!/taobao\.com|tmall\.com/.test(url)) {
        // The plugin's own browser was just started or parked on a blank page:
        // land it on Taobao once so login state is observable.
        await this.cdp.navigate('https://www.taobao.com', { timeoutMs: 20000 }).catch(() => {})
        await sleep(900)
        url = String(await this.cdp.evaluate('location.href').catch(() => 'about:blank'))
      }
      const login = await this.page(pageLoginState)
      return { browser: true, loggedIn: login.hasSessionCookie && !login.promptLogin, nick: login.nick, url: login.url }
    } catch (error) {
      return { browser: false, loggedIn: false, error: String(error?.message || error) }
    }
  }

  async openLoginPage() {
    await this.ensure()
    const current = await this.cdp.evaluate('location.href').catch(() => '')
    if (!/login\.taobao\.com|login\.tmall\.com/.test(String(current))) {
      await this.cdp.navigate('https://login.taobao.com/member/login.jhtml', { timeoutMs: 30000 })
      await sleep(1200)
    }
    return true
  }

  async openLogin() {
    await this.openLoginPage()
    await this.cdp.bringToFront()
    return { opened: true }
  }

  async loginState() {
    try {
      await this.ensure()
      const stage = await this.page(pageLoginStage)
      return { ok: true, ...stage }
    } catch (error) {
      return { ok: false, reason: String(error?.message || error) }
    }
  }

  /** Capture the live QR code from the login page so the panel can show it inline. */
  async loginQr() {
    await this.openLoginPage()
    const url = await this.cdp.evaluate('location.href').catch(() => '')
    if (!/login\.taobao\.com|login\.tmall\.com/.test(String(url))) {
      return {
        ok: false,
        needLogout: true,
        reason: '当前浏览器已经处于登录状态，不需要扫码。要换账号请点“换账号”。',
      }
    }
    const ready = await this.cdp.waitFor(
      `Boolean(document.querySelector('.qrcode-img canvas, .qrcode-login canvas, .qrcode-login img, canvas'))`,
      { timeoutMs: 15000 },
    )
    if (!ready) return { ok: false, reason: '登录页没有出现二维码' }
    await sleep(500)
    const rect = await this.page(pageQrRect)
    if (!rect) return { ok: false, reason: '没有找到二维码画布' }
    const shot = await this.cdp.send('Page.captureScreenshot', {
      format: 'png',
      clip: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        scale: 3,
      },
    })
    const stage = await this.page(pageLoginStage)
    return { ok: true, qr: `data:image/png;base64,${shot.data}`, at: Date.now(), stage: stage.stage, loggedIn: stage.loggedIn }
  }

  /** Sign out the plugin's browser so another account can sign in. */
  async switchAccount() {
    await this.ensure()
    await this.cdp.send('Network.enable')
    await this.cdp.send('Network.clearBrowserCookies')
    await this.cdp.navigate('https://login.taobao.com/member/login.jhtml', { timeoutMs: 30000 })
    await sleep(1500)
    this.cdp.bringToFront().catch(() => {})
    return { ok: true }
  }

  /** SMS login, step 1: switch tab, fill the phone number, request the code. */
  async smsStart(phone) {
    await this.openLoginPage()
    await this.page(pageLoginSetup, 'sms')
    await sleep(700)
    const filled = await this.page(pageNativeSet, '#fm-sms-login-id', phone)
    if (!filled) return { ok: false, reason: '没有找到手机号输入框' }
    await sleep(300)
    const clicked = await this.page(pageClickText, ['获取验证码', '获取短信验证码', '发送验证码'])
    await sleep(1800)
    const captcha = await this.page(pageCaptchaVisible)
    await this.cdp.bringToFront()
    return {
      ok: clicked,
      needCaptcha: captcha,
      reason: clicked ? '' : '没有找到“获取验证码”按钮',
      note: captcha
        ? '淘宝弹出了滑块/安全验证，请在浏览器窗口里拖动滑块完成，然后再点“登录”。'
        : '验证码已请求，请查看手机短信并填入。',
      errors: await this.page(pageLoginErrors),
    }
  }

  /** SMS login, step 2: fill the received code and submit. */
  async smsSubmit(code) {
    await this.ensure()
    const filled = await this.page(pageNativeSet, '#fm-smscode', code)
    if (!filled) return { ok: false, reason: '没有找到验证码输入框' }
    await sleep(200)
    const clicked = await this.page(pageClickSubmit)
    await sleep(3000)
    const captcha = await this.page(pageCaptchaVisible)
    const stage = await this.page(pageLoginStage)
    return {
      ok: Boolean(clicked) && !captcha,
      needCaptcha: captcha,
      loggedIn: stage.loggedIn,
      stage: stage.stage,
      reason: clicked ? '' : '没有找到登录按钮',
      errors: await this.page(pageLoginErrors),
    }
  }

  async fillLogin(account, password) {
    await this.openLoginPage()
    await this.page(pageLoginSetup, 'password')
    await sleep(500)
    const info = await this.page(pagePageInfo)
    if (/扫描成功|确认登录/.test(info.snippet)) {
      return { ok: false, reason: '登录页当前停在“确认登录”状态，请先在浏览器里处理，或点“刷新二维码”重新扫码。' }
    }
    const filled = await this.page(pageFillLogin, account, password)
    await this.cdp.bringToFront()
    return filled
  }

  async search(query, { limit = 40 } = {}) {
    await this.ensure()
    await this.cdp.navigate(SEARCH_URL(query), { timeoutMs: 30000 })
    let ready = await this.cdp.waitFor(
      `document.body && (document.querySelectorAll('a[href*="/item.htm"]').length > 3 || /亲，请登录/.test(document.body.innerText||''))`,
      { timeoutMs: 18000 },
    )
    if (!ready) {
      // Taobao occasionally answers a blank document on the first hit; one reload fixes it.
      await this.cdp.send('Page.reload', {}).catch(() => {})
      ready = await this.cdp.waitFor(
        `document.body && (document.querySelectorAll('a[href*="/item.htm"]').length > 3 || /亲，请登录/.test(document.body.innerText||''))`,
        { timeoutMs: 18000 },
      )
    }
    if (!ready) {
      const info = await this.page(pagePageInfo)
      const punish = await this.page(pagePunish).catch(() => ({ punished: false }))
      return {
        blocked: true,
        punishment: Boolean(punish.punished),
        reason: punish.punished
          ? '淘宝把当前访问判定为异常（风控拦截）'
          : '搜索结果没有加载出来',
        info,
      }
    }
    const punish = await this.page(pagePunish).catch(() => ({ punished: false }))
    if (punish.punished) {
      return {
        blocked: true,
        punishment: true,
        reason: '淘宝把当前访问判定为异常（风控拦截）',
        info: punish,
      }
    }
    const login = await this.page(pageLoginState)
    if (login.hasSessionCookie === false && login.promptLogin) {
      return { blocked: true, needLogin: true, reason: '淘宝要求登录后才能查看搜索结果' }
    }
    // lazy loading: two gentle scrolls
    for (let i = 0; i < 2; i += 1) {
      await this.cdp.evaluate('window.scrollBy(0, Math.round(window.innerHeight*1.6))').catch(() => {})
      await sleep(1200)
    }
    let items = await this.page(pageExtractItems)
    if (!Array.isArray(items)) items = []
    const seen = new Set()
    const clean = []
    for (const item of items) {
      if (!item || !item.id || seen.has(item.id)) continue
      if (!item.price || item.price <= 0) continue
      seen.add(item.id)
      clean.push(item)
      if (clean.length >= limit) break
    }
    const info = await this.page(pagePageInfo)
    return {
      blocked: clean.length === 0,
      needLogin: clean.length === 0 && /亲，请登录/.test(info.snippet),
      query,
      items: clean,
      info,
    }
  }

  async detail(url) {
    await this.ensure()
    await this.cdp.navigate(url, { timeoutMs: 30000 })
    await sleep(2500)
    const info = await this.page(pagePageInfo)
    const data = await this.cdp.evaluate(`(() => {
      const text = document.body ? document.body.innerText : ''
      const title = document.title || ''
      const priceMatch = text.match(/[¥￥]\\s*([\\d,]+(?:\\.\\d+)?)/)
      return { title, price: priceMatch ? Number(priceMatch[1].replace(/,/g,'')) : 0, snippet: text.replace(/\\s+/g,' ').slice(0, 1500) }
    })()`)
    return { ...info, ...data }
  }

  async askSeller(url, message) {
    await this.ensure()
    const steps = []
    await this.cdp.navigate(url, { timeoutMs: 30000 })
    await sleep(2500)
    const entry = await this.page(pageFindSupportEntry)
    steps.push({ step: '查找客服入口', ...entry })
    if (!entry.found) {
      return { sent: false, steps, note: '没有在商品页找到客服入口，已把问题准备好，可以手动打开商品页联系卖家。' }
    }
    await sleep(3000)
    const typed = await this.page(pageTypeIntoChat, message)
    steps.push({ step: '填写并发送', ...typed })
    await this.cdp.bringToFront()
    return {
      sent: Boolean(typed.sent),
      steps,
      note: typed.ok
        ? '已在客服窗口填入并发送；请在弹出的浏览器窗口确认对方回复。'
        : '客服窗口没有找到输入框，请在浏览器中手动发送下面这段话。',
    }
  }

  async openItem(url) {
    await this.ensure()
    await this.cdp.navigate(url, { timeoutMs: 30000 })
    await this.cdp.bringToFront()
    return { opened: true }
  }
}

export { sleep }
