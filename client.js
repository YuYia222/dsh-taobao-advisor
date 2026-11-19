/** Client half: the sidebar page of the Taobao model-shopping adviser. */
// Never throw while the page boots: a failed entry makes the whole shell refuse
// to start, so a missing loader facade is a no-op instead of an exception.
if (typeof window !== 'undefined' && window.__ModuleLoader__ && typeof window.__ModuleLoader__.load === 'function') {
window.__ModuleLoader__.load({
  id: '@local/dsh-taobao-advisor',
  factory(require) {
    const React = require('react')
    const h = React.createElement
    const { useEffect, useRef, useState } = React

    const en = typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().startsWith('en')
    const t = {
      title: en ? 'Taobao picker' : '淘宝选型助手',
      subtitle: en
        ? 'Name a model — I compare the listings and keep them until you switch models.'
        : '报个型号，我把链接、价格、性价比和性能一次算清楚。',
      signedIn: en ? 'Signed in' : '已登录',
      signedOut: en ? 'Not signed in' : '未登录',
      checking: en ? 'Checking…' : '检测中…',
      switchAccount: en ? 'Switch account' : '换账号',
      openWindow: en ? 'Open login window' : '在窗口里登录',
      searchPlaceholder: en ? 'Model, e.g. iPhone 17 Pro 256G' : '输入型号，例如 iPhone 17 Pro 256G',
      search: en ? 'Compare' : '搜索并比价',
      searching: en ? 'Searching…' : '正在搜索…',
      changeModel: en ? 'Change model' : '换型号',
      noResults: en ? 'Search a model to start.' : '输入型号开始比价，结果会一直保留到你换型号。',
      cheapest: en ? 'Cheapest' : '最便宜',
      value: en ? 'Best value' : '性价比最高',
      performance: en ? 'Most powerful' : '性能最强',
      open: en ? 'Open' : '打开',
      ask: en ? 'Ask seller' : '问客服',
      detail: en ? 'Details' : '看详情',
      hide: en ? 'Hide' : '收起',
      unknownSales: en ? 'sales n/a' : '销量未知',
      qrTitle: en ? 'Scan with the Taobao app' : '用手机淘宝扫一扫',
      qrHint: en ? 'Open Taobao → top-left scanner' : '打开淘宝 App → 左上角扫一扫',
      qrScanned: en ? 'Scanned — confirm on your phone' : '已扫码，请在手机上确认',
      qrExpired: en ? 'QR expired' : '二维码已失效',
      qrRetryHint: en ? 'No QR yet — click “Refresh QR”' : '二维码没生成出来，点下面「刷新二维码」重试',
      qrLoading: en ? 'Loading QR…' : '正在生成二维码…',
      refreshQr: en ? 'Refresh QR' : '刷新二维码',
      smsTab: en ? 'SMS code' : '短信登录',
      pwdTab: en ? 'Password' : '密码登录',
      phone: en ? 'Phone number' : '手机号',
      code: en ? '6-digit code' : '短信验证码',
      sendCode: en ? 'Send code' : '获取验证码',
      resend: en ? 'Resend in' : '重发',
      signIn: en ? 'Sign in' : '登录',
      account: en ? 'Account' : '账号',
      password: en ? 'Password' : '密码',
      pwdNote: en
        ? 'The password is typed into the local browser form only and is never stored.'
        : '密码只填进本地浏览器窗口，不保存、不外传。',
      smsNote: en
        ? 'Taobao may still show a slider in the browser window; finish it there.'
        : '淘宝可能还会弹滑块验证，需要在浏览器窗口里拖一下。',
      loginFirst: en ? 'Sign in first — Taobao hides search results from guests.' : '淘宝要求先登录，才会显示搜索结果。',
      askTitle: en ? 'Send this to the seller' : '把这句问题发给卖家客服',
      send: en ? 'Send for me' : '代我发送',
      close: en ? 'Close' : '关闭',
      sending: en ? 'Working…' : '正在操作浏览器…',
      sortSmart: en ? 'Smart' : '综合',
      sortPrice: en ? 'Price ↑' : '价格从低到高',
      sortSales: en ? 'Sales ↓' : '销量优先',
      range: en ? 'range' : '区间',
      median: en ? 'median' : '中位',
      items: en ? 'compared' : '个可比价',
      allBrands: en ? 'All brands' : '全部品牌',
      clearFilters: en ? 'Clear filters' : '清除筛选',
      facetPoles: en ? 'Poles' : '极数',
      facetAmp: en ? 'Current' : '电流',
      facetPower: en ? 'Power' : '功率',
      facetVoltage: en ? 'Voltage' : '电压',
      facetStorage: en ? 'Capacity' : '容量',
      excluded: en ? 'filtered out' : '条被过滤',
      retry: en ? 'Retry' : '重试',
      noMatch: en
        ? 'No listing could be confirmed as the same model — the raw results are listed below.'
        : '没有能确认是同一型号的可比价结果，下面是原始搜索结果，可以自己挑。',
      singleTab: en ? 'One model' : '单品比价',
      batchTab: en ? 'Batch + Excel' : '批量比价',
      batchTitle: en ? 'Compare many items and export an Excel' : '多项一起比价，直接导出 Excel',
      batchHint: en
        ? 'Download the template, fill one row per item, upload it here. Each row gets cheapest / best value / strongest links.'
        : '先下载模板，一件商品一行填好，再从这里上传。每行都会给出最便宜、性价比最高、性能最强的链接，并汇总成一个 Excel。',
      downloadTemplate: en ? 'Template' : '下载 Excel 模板',
      chooseFile: en ? 'Choose file' : '选择 Excel / CSV',
      parsing: en ? 'Reading…' : '读取中…',
      rows: en ? 'rows' : '行',
      startBatch: en ? 'Start batch' : '开始批量比价',
      batchRunning: en ? 'Running…' : '比价进行中…',
      downloadResult: en ? 'Download Excel' : '下载结果 Excel',
      colName: en ? 'Model' : '品名/型号',
      colSpec: en ? 'Spec' : '规格',
      colBudget: en ? 'Budget' : '预算',
      colQty: en ? 'Qty' : '数量',
      showBrowser: en ? 'Show browser' : '显示浏览器',
      hideBrowser: en ? 'Run hidden' : '后台运行',
      reloadUi: en ? 'Reload UI' : '刷新界面',
      buildTag: 'v19',
      outdated: en ? 'A newer build of this panel is available.' : '插件界面已更新，当前页面还在跑旧版本。',      reloadNow: en ? 'Reload now' : '立即刷新',
    }

    const API = () => new URL('api/taobao-advisor', document.baseURI).href

    /** Product photos go through our own origin: no hotlink or CSP surprises. */
    const imageUrl = (src) => `${API()}?img=${encodeURIComponent(src)}`

    async function rpc(method, args) {
      const response = await fetch(API(), {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ method, args: args ?? {} }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return await response.json()
    }

    const css = `
.ta-root{display:flex;flex-direction:column;height:100%;min-height:0;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:13px;line-height:1.6;overflow:hidden}
.ta-top{flex:none;padding:14px 22px 12px;border-bottom:1px solid var(--dsw-alias-border-l1);display:flex;align-items:center;gap:12px;z-index:3}
.ta-brand{display:flex;align-items:center;gap:10px;min-width:0}
.ta-brand h1{margin:0;font-size:15px;font-weight:600;letter-spacing:.2px}
.ta-brand p{margin:1px 0 0;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ta-grow{flex:1}
.ta-pill{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.ta-dot{width:6px;height:6px;border-radius:50%;background:var(--dsw-alias-state-idle-primary)}
.ta-dot.ok{background:var(--dsw-alias-state-success-primary)}
.ta-dot.warn{background:var(--dsw-alias-state-warn-primary)}
.ta-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:30px;padding:0 13px;border-radius:8px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:12px;font-family:inherit;cursor:pointer;transition:background .12s ease;white-space:nowrap;text-decoration:none}
.ta-btn:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2)}
.ta-btn:disabled{opacity:.45;cursor:default}
.ta-btn.primary{background:var(--dsw-alias-brand-primary);border-color:transparent;color:var(--dsw-alias-bg-base);font-weight:600}
.ta-btn.primary:hover:not(:disabled){filter:brightness(1.07)}
/* A disabled primary must stay a readable neutral pill, not a washed-out block. */
.ta-btn.primary:disabled{opacity:1;background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);font-weight:500}
.ta-btn.quiet{border-color:transparent;background:transparent;color:var(--dsw-alias-label-secondary)}
.ta-btn.quiet:hover:not(:disabled){background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ta-btn.sm{height:26px;padding:0 10px;font-size:11.5px;border-radius:7px}
.ta-scroll{flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;padding:0 22px 26px;scrollbar-gutter:stable}
.ta-scroll::-webkit-scrollbar{width:10px}
.ta-scroll::-webkit-scrollbar-track{background:transparent}
.ta-scroll::-webkit-scrollbar-thumb{background:var(--dsw-alias-border-l2);border-radius:5px;border:2px solid transparent;background-clip:content-box}
.ta-scroll::-webkit-scrollbar-thumb:hover{background:var(--dsw-alias-label-secondary)}
.ta-wrap{max-width:1000px;margin:0 auto}
.ta-searchrow{display:flex;gap:8px;padding:16px 0 12px;position:sticky;top:0;background:var(--dsw-alias-bg-base);z-index:2}
.ta-input{height:38px;padding:0 13px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);font-size:13px;font-family:inherit;outline:none;transition:border-color .12s ease}
.ta-input:focus{border-color:var(--dsw-alias-brand-primary)}
.ta-input::placeholder{color:var(--dsw-alias-label-secondary)}
.ta-input.grow{flex:1;min-width:0}
.ta-searchbtn{height:38px;padding:0 20px;border-radius:9px;font-size:13px;font-weight:500}
.ta-banner{display:flex;align-items:flex-start;gap:10px;padding:11px 14px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);margin:0 0 14px;font-size:12.5px}
.ta-banner.err{border-color:var(--dsw-alias-state-error-primary)}
.ta-banner.warn{border-color:var(--dsw-alias-state-warn-primary)}
.ta-banner .ta-grow{flex:1;min-width:0}
.ta-login{display:grid;grid-template-columns:224px minmax(0,1fr);border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);overflow:hidden;margin:0 0 16px}
.ta-login-left{padding:20px 18px;display:flex;flex-direction:column;align-items:center;gap:7px;border-right:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2)}
.ta-qr{width:168px;height:168px;border-radius:10px;background:#fff;border:1px solid var(--dsw-alias-border-l1);display:flex;align-items:center;justify-content:center;overflow:hidden}
.ta-qr img{width:100%;height:100%;object-fit:contain;display:block}
.ta-qr-loading{font-size:11.5px;color:#8a8a8a;text-align:center;padding:0 12px;line-height:1.5}
.ta-tip{font-size:11.5px;color:var(--dsw-alias-label-secondary);text-align:center;line-height:1.5}
.ta-stage{font-size:11.5px;color:var(--dsw-alias-state-warn-primary);min-height:17px;text-align:center}
.ta-login-right{padding:18px 20px;display:flex;flex-direction:column;gap:12px}
.ta-tabs{display:inline-flex;padding:3px;border-radius:9px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);align-self:flex-start}
.ta-tab{height:26px;padding:0 14px;border:0;border-radius:6px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;font-family:inherit;cursor:pointer}
.ta-tab.on{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.ta-form{display:flex;flex-direction:column;gap:9px}
.ta-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.ta-note{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.55;white-space:pre-wrap}
.ta-note.bad{color:var(--dsw-alias-state-error-primary)}
.ta-summary{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:0 0 12px}
.ta-chip{display:inline-flex;align-items:center;gap:6px;height:24px;padding:0 10px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ta-chip b{color:var(--dsw-alias-label-primary);font-weight:600}
.ta-decision{padding:11px 14px;border-radius:10px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);border-left:3px solid var(--dsw-alias-brand-primary);font-size:12.5px;margin-bottom:14px;line-height:1.65}
.ta-picks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-bottom:16px}
.ta-pick{display:flex;flex-direction:column;gap:5px;padding:12px 13px;border-radius:11px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);box-shadow:0 1px 2px rgba(0,0,0,.06)}
.ta-rank{font-size:11px;color:var(--dsw-alias-label-secondary);letter-spacing:.4px}
.ta-bigprice{font-size:19px;font-weight:650;color:var(--dsw-alias-state-error-primary);line-height:1.2}
.ta-ptitle{font-size:12px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;min-height:36px}
.ta-pmeta{font-size:11px;color:var(--dsw-alias-label-secondary);display:flex;gap:8px;flex-wrap:wrap;margin-bottom:4px}
.ta-listhead{display:flex;align-items:center;gap:8px;margin:4px 0 8px}
.ta-label{font-size:12px;color:var(--dsw-alias-label-secondary)}
.ta-seg{display:inline-flex;padding:2px;border-radius:7px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}
.ta-seg button{height:22px;padding:0 9px;border:0;border-radius:5px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:11px;font-family:inherit;cursor:pointer}
.ta-seg button.on{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.ta-items{display:flex;flex-direction:column;gap:10px}
.ta-item{display:flex;gap:12px;padding:12px;border-radius:12px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-2);box-shadow:0 1px 2px rgba(0,0,0,.06);transition:border-color .12s ease,box-shadow .12s ease;flex-wrap:wrap}
.ta-item:hover{border-color:var(--dsw-alias-border-l2);box-shadow:0 2px 10px rgba(0,0,0,.08)}
.ta-thumb{width:68px;height:68px;flex:none;border-radius:9px;object-fit:cover;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}
.ta-thumbwrap{width:68px;height:68px;flex:none;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1);display:flex;align-items:center;justify-content:center;font-size:10.5px;color:var(--dsw-alias-label-secondary)}
.ta-brandbar{display:flex;flex-wrap:wrap;gap:6px;margin:0 0 8px}
.ta-facets{display:flex;flex-direction:column;gap:6px;margin:0 0 14px;padding:10px 12px;border-radius:10px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1)}
.ta-facetrow{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
.ta-facetlabel{font-size:11px;color:var(--dsw-alias-label-secondary);min-width:28px}
.ta-chipbtn{height:25px;padding:0 11px;border-radius:999px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);font-size:11.5px;font-family:inherit;cursor:pointer;transition:background .12s ease,color .12s ease}
.ta-chipbtn:hover{background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary)}
.ta-chipbtn.on{background:var(--dsw-alias-bg-layer-2);border-color:var(--dsw-alias-border-l2);color:var(--dsw-alias-label-primary);font-weight:600}
.ta-main{flex:1;min-width:200px;display:flex;flex-direction:column;gap:4px}
.ta-title{font-size:12.5px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.ta-meta{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.ta-price{color:var(--dsw-alias-state-error-primary);font-weight:650;font-size:14px}
.ta-tag{display:inline-flex;align-items:center;height:18px;padding:0 6px;border-radius:5px;font-size:10.5px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary)}
.ta-tag.hot{color:var(--dsw-alias-state-error-primary);border-color:currentColor}
.ta-tag.good{color:var(--dsw-alias-state-success-primary);border-color:currentColor}
.ta-tag.dim{opacity:.85}
.ta-actions{flex:none;display:flex;flex-direction:column;gap:6px;width:84px}
.ta-detail{flex-basis:100%;margin:2px 0 0;padding:10px 12px;border-radius:8px;background:var(--dsw-alias-bg-base);border:1px solid var(--dsw-alias-border-l1);font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;max-height:220px;overflow:auto}
.ta-empty{display:flex;flex-direction:column;align-items:center;gap:10px;padding:56px 0;color:var(--dsw-alias-label-secondary);font-size:12.5px;text-align:center}
.ta-tabs2{display:inline-flex;gap:2px;padding:2px;border-radius:9px;background:var(--dsw-alias-bg-layer-2);border:1px solid var(--dsw-alias-border-l1)}
.ta-tabs2 button{height:26px;padding:0 14px;border:0;border-radius:7px;background:transparent;color:var(--dsw-alias-label-secondary);font-size:12px;font-family:inherit;cursor:pointer}
.ta-tabs2 button.on{background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary)}
.ta-batchcard{border:1px solid var(--dsw-alias-border-l1);border-radius:12px;background:var(--dsw-alias-bg-layer-1);padding:16px;display:flex;flex-direction:column;gap:12px;margin-bottom:16px}
.ta-table{width:100%;border-collapse:collapse;font-size:11.5px}
.ta-table th,.ta-table td{border-bottom:1px solid var(--dsw-alias-border-l1);padding:6px 8px;text-align:left;vertical-align:top}
.ta-table th{color:var(--dsw-alias-label-secondary);font-weight:600}
.ta-progress{height:6px;border-radius:3px;background:var(--dsw-alias-bg-layer-2);overflow:hidden}
.ta-progress i{display:block;height:100%;background:var(--dsw-alias-brand-primary);transition:width .3s ease}
.ta-mask{position:absolute;inset:0;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;z-index:30}
.ta-modal{width:min(600px,92%);border-radius:14px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-overlay);padding:18px;display:flex;flex-direction:column;gap:12px;box-shadow:0 18px 50px rgba(0,0,0,.35)}
.ta-modal h3{margin:0;font-size:13.5px;font-weight:600}
.ta-target{font-size:11.5px;color:var(--dsw-alias-label-secondary);line-height:1.55}
.ta-modal textarea{min-height:120px;padding:11px;border-radius:9px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font-size:12.5px;font-family:inherit;line-height:1.6;resize:vertical;outline:none}
.ta-modal textarea:focus{border-color:var(--dsw-alias-brand-primary)}
.ta-foot{display:flex;justify-content:flex-end;gap:8px}
.ta-steps{font-size:11.5px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;line-height:1.6}
@media (max-width:760px){.ta-login{grid-template-columns:minmax(0,1fr)}.ta-login-left{border-right:0;border-bottom:1px solid var(--dsw-alias-border-l1)}.ta-picks{grid-template-columns:minmax(0,1fr)}}
`

    function Glyph(props) {
      const size = props.size || 18
      return h('svg', { viewBox: '0 0 24 24', width: size, height: size, 'aria-hidden': true, style: { display: 'block' } },
        h('path', {
          d: 'M4 6.6h16l-1.5 10.3a2 2 0 0 1-2 1.7H7.5a2 2 0 0 1-2-1.7L4 6.6Z',
          fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinejoin: 'round',
        }),
        h('path', { d: 'M8.7 6.6a3.3 3.3 0 0 1 6.6 0', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6 }),
        h('path', {
          d: 'M9.1 12.5l2 2 3.9-4.1', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6,
          strokeLinecap: 'round', strokeLinejoin: 'round',
        }))
    }

    function Tag(props) {
      return h('span', { className: `ta-tag ${props.tone || ''}` }, props.children)
    }

    function Picks(props) {
      const picks = props.analysis.picks || {}
      const cards = [
        { key: 'cheapest', label: t.cheapest, item: picks.cheapest },
        { key: 'value', label: t.value, item: picks.value },
        { key: 'performance', label: t.performance, item: picks.performance },
      ].filter((card) => card.item)
      if (cards.length === 0) return null
      return h('div', { className: 'ta-picks' }, ...cards.map((card) => h('div', { className: 'ta-pick', key: card.key },
        h('div', { className: 'ta-rank' }, card.label),
        h('div', { className: 'ta-bigprice' }, `¥${card.item.price}`),
        h('div', { className: 'ta-ptitle', title: card.item.title }, card.item.title),
        h('div', { className: 'ta-pmeta' },
          h('span', null, card.item.salesText || t.unknownSales),
          card.item.shop ? h('span', null, card.item.shop) : null),
        h('button', { className: 'ta-btn sm', onClick: () => props.onOpen(card.item) }, t.open))))
    }

    function Item(props) {
      const item = props.item
      const flags = item.flags || {}
      const tags = []
      if (props.rank === 'cheapest') tags.push({ text: t.cheapest, tone: 'hot' })
      if (props.rank === 'value') tags.push({ text: t.value, tone: 'good' })
      if (props.rank === 'performance') tags.push({ text: t.performance, tone: 'good' })
      if (flags.accessory) tags.push({ text: en ? 'accessory' : '配件', tone: 'dim' })
      if (flags.installment) tags.push({ text: en ? 'installment' : '分期', tone: 'dim' })
      if (flags.risk) tags.push({ text: en ? 'used' : '二手', tone: 'hot' })
      if (flags.grey) tags.push({ text: en ? 'import' : '水货', tone: 'dim' })
      if (item.tmall) tags.push({ text: en ? 'Tmall' : '天猫', tone: 'dim' })

      const thumb = item.image
        ? h('img', {
          className: 'ta-thumb',
          src: imageUrl(item.image),
          alt: item.title,
          loading: 'lazy',
          onError: (event) => { event.currentTarget.style.visibility = 'hidden' },
        })
        : h('div', { className: 'ta-thumbwrap' }, en ? 'no photo' : '无图')

      return h('div', { className: 'ta-item' }, thumb,
        h('div', { className: 'ta-main' },
          h('div', { className: 'ta-title', title: item.title }, item.title),
          h('div', { className: 'ta-meta' },
            h('span', { className: 'ta-price' }, `¥${item.price}`),
            h('span', null, item.salesText || t.unknownSales),
            item.shop ? h('span', null, item.shop) : null,
            item.location ? h('span', null, item.location) : null,
            ...tags.map((tag, index) => h(Tag, { key: `g${index}`, tone: tag.tone }, tag.text))),
          h('div', { className: 'ta-meta' },
            item.brand ? h('span', null, item.brand) : null,
            h('span', null, `${en ? 'perf' : '性能'} ${item.performance}`),
            h('span', null, `${en ? 'value' : '性价比'} ${item.value}`),
            item.spec && item.spec.storage ? h('span', null, `${item.spec.storage}G`) : null)),
        h('div', { className: 'ta-actions' },
          h('button', { className: 'ta-btn sm', onClick: () => props.onOpen(item) }, t.open),
          h('button', { className: 'ta-btn sm quiet', onClick: () => props.onAsk(item) }, t.ask),
          h('button', { className: 'ta-btn sm quiet', onClick: () => props.onDetail(item) }, props.detail ? t.hide : t.detail)),
        props.detail ? h('div', { className: 'ta-detail' }, props.detail) : null)
    }

    function LoginCard(props) {
      const [tab, setTab] = useState('sms')
      const [qr, setQr] = useState('')
      const [qrStage, setQrStage] = useState('loading')
      const [phone, setPhone] = useState('')
      const [code, setCode] = useState('')
      const [account, setAccount] = useState('')
      const [password, setPassword] = useState('')
      const [busy, setBusy] = useState('')
      const [note, setNote] = useState('')
      const [bad, setBad] = useState(false)
      const [cooldown, setCooldown] = useState(0)
      const alive = useRef(true)
      const busyRef = useRef(false)

      const loadQr = async () => {
        if (busyRef.current) return
        busyRef.current = true
        setQrStage('loading')
        try {
          let result = await rpc('loginQr')
          // A restarted Harness or browser leaves one stale call behind; retry once.
          if (!result.ok && !result.needLogout) {
            await new Promise((resolve) => { setTimeout(resolve, 1200) })
            result = await rpc('loginQr')
          }
          if (!alive.current) return
          if (result.ok) {
            setQr(result.qr)
            setQrStage(result.loggedIn ? 'ok' : result.stage === 'scanned' ? 'scanned' : 'ready')
          } else if (result.needLogout) {
            // The browser already holds a session: nothing to scan, just switch views.
            props.onDone()
          } else {
            setQrStage('error')
            setNote(result.reason || '')
            setBad(true)
          }
        } catch (err) {
          if (alive.current) { setQrStage('error'); setNote(String(err.message || err)); setBad(true) }
        } finally {
          busyRef.current = false
        }
      }

      useEffect(() => {
        alive.current = true
        loadQr()
        const timer = setInterval(async () => {
          if (busyRef.current) return
          try {
            const state = await rpc('loginState')
            if (!alive.current) return
            if (state.loggedIn) { setQrStage('ok'); props.onDone(); return }
            if (state.stage === 'scanned') setQrStage('scanned')
            else if (state.stage === 'expired') { setQrStage('expired'); loadQr() }
          } catch { /* keep polling */ }
        }, 3000)
        return () => { alive.current = false; clearInterval(timer) }
      }, [])

      useEffect(() => {
        if (cooldown <= 0) return undefined
        const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
        return () => clearTimeout(timer)
      }, [cooldown])

      const run = async (key, fn) => {
        setBusy(key)
        setBad(false)
        setNote('')
        try {
          const result = await fn()
          if (result && result.ok === false) setBad(true)
          setNote(result?.note || result?.hint || result?.reason || '')
          if (result?.needCaptcha) setBad(true)
          if (result?.loggedIn) props.onDone()
        } catch (err) {
          setBad(true)
          setNote(String(err.message || err))
        } finally {
          setBusy('')
        }
      }

      const stageText = qrStage === 'scanned' ? t.qrScanned : qrStage === 'expired' ? t.qrExpired : ''

      return h('div', { className: 'ta-login' },
        h('div', { className: 'ta-login-left' },
          h('div', { className: 'ta-qr' },
            qr
              ? h('img', { src: qr, alt: 'login-qr' })
              : h('div', { className: 'ta-qr-loading' }, qrStage === 'loading' ? t.qrLoading : t.qrRetryHint)),
          h('div', { className: 'ta-tip' }, t.qrTitle),
          h('div', { className: 'ta-tip' }, t.qrHint),
          h('div', { className: 'ta-stage' }, stageText),
          h('button', { className: 'ta-btn sm quiet', onClick: loadQr, disabled: busy === 'qr' }, t.refreshQr)),

        h('div', { className: 'ta-login-right' },
          h('div', { className: 'ta-tabs' },
            h('button', { className: `ta-tab ${tab === 'sms' ? 'on' : ''}`, onClick: () => setTab('sms') }, t.smsTab),
            h('button', { className: `ta-tab ${tab === 'pwd' ? 'on' : ''}`, onClick: () => setTab('pwd') }, t.pwdTab)),

          tab === 'sms'
            ? h('div', { className: 'ta-form' },
              h('div', { className: 'ta-row' },
                h('input', {
                  className: 'ta-input grow', placeholder: t.phone, value: phone, inputMode: 'numeric',
                  onChange: (event) => setPhone(event.target.value.replace(/[^\d]/g, '').slice(0, 11)),
                }),
                h('button', {
                  className: 'ta-btn', disabled: busy === 'sms' || cooldown > 0 || phone.length !== 11,
                  onClick: () => run('sms', async () => {
                    const result = await rpc('smsStart', { phone })
                    if (result.ok) setCooldown(60)
                    return result
                  }),
                }, cooldown > 0 ? `${t.resend} ${cooldown}s` : t.sendCode)),
              h('div', { className: 'ta-row' },
                h('input', {
                  className: 'ta-input grow', placeholder: t.code, value: code, inputMode: 'numeric',
                  onChange: (event) => setCode(event.target.value.replace(/[^\d]/g, '').slice(0, 8)),
                }),
                h('button', {
                  className: 'ta-btn primary', disabled: busy === 'code' || code.length < 4,
                  onClick: () => run('code', () => rpc('smsSubmit', { code })),
                }, busy === 'code' ? t.sending : t.signIn)),
              h('div', { className: 'ta-note' }, t.smsNote))
            : h('div', { className: 'ta-form' },
              h('input', {
                className: 'ta-input', placeholder: t.account, value: account,
                onChange: (event) => setAccount(event.target.value),
              }),
              h('input', {
                className: 'ta-input', type: 'password', placeholder: t.password, value: password,
                onChange: (event) => setPassword(event.target.value),
              }),
              h('div', { className: 'ta-row' },
                h('button', {
                  className: 'ta-btn primary', disabled: busy === 'pwd' || !account || !password,
                  onClick: () => run('pwd', async () => {
                    const result = await rpc('fillLogin', { account, password })
                    setPassword('')
                    return result
                  }),
                }, busy === 'pwd' ? t.sending : t.signIn),
                h('button', { className: 'ta-btn quiet', onClick: () => rpc('login').catch(() => {}) }, t.openWindow)),
              h('div', { className: 'ta-note' }, t.pwdNote)),

          note ? h('div', { className: `ta-note ${bad ? 'bad' : ''}` }, note) : null))
    }

    function BatchPanel() {
      const [rows, setRows] = useState([])
      const [fileName, setFileName] = useState('')
      const [busy, setBusy] = useState(false)
      const [note, setNote] = useState('')
      const [bad, setBad] = useState(false)
      const [batch, setBatch] = useState(null)
      const fileRef = useRef(null)
      const poller = useRef(null)

      const poll = () => {
        if (poller.current) return
        poller.current = setInterval(async () => {
          try {
            const result = await rpc('batchStatus')
            if (result?.ok) {
              setBatch(result.batch)
              if (!result.batch?.running && poller.current) {
                clearInterval(poller.current)
                poller.current = null
              }
            }
          } catch { /* keep polling */ }
        }, 2000)
      }

      useEffect(() => {
        rpc('batchStatus').then((result) => {
          if (result?.ok) {
            setBatch(result.batch)
            if (result.batch?.running) poll()
          }
        }).catch(() => {})
        return () => { if (poller.current) { clearInterval(poller.current); poller.current = null } }
      }, [])

      const onFile = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return
        setBusy(true)
        setBad(false)
        setNote('')
        try {
          const buffer = await file.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          for (let i = 0; i < bytes.length; i += 0x8000) {
            binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
          }
          const result = await rpc('parseSheet', { name: file.name, data: btoa(binary) })
          if (!result.ok) {
            setBad(true)
            setNote(result.reason || '解析失败')
            setRows([])
          } else {
            setRows(result.rows)
            setFileName(file.name)
            setNote(`读到 ${result.rows.length} 行需求`)
          }
        } catch (err) {
          setBad(true)
          setNote(String(err.message || err))
        } finally {
          setBusy(false)
          if (fileRef.current) fileRef.current.value = ''
        }
      }

      const start = async () => {
        setBusy(true)
        setBad(false)
        setNote('')
        try {
          const result = await rpc('batchStart', { rows })
          if (!result.ok) {
            setBad(true)
            setNote(result.reason || '启动失败')
          } else {
            setBatch(result.batch)
            poll()
          }
        } catch (err) {
          setBad(true)
          setNote(String(err.message || err))
        } finally {
          setBusy(false)
        }
      }

      const running = Boolean(batch?.running)
      const percent = batch && batch.total ? Math.round((batch.done / batch.total) * 100) : 0

      return h('div', { className: 'ta-batchcard' },
        h('div', { className: 'ta-row' },
          h('div', { className: 'ta-grow' },
            h('div', { style: { fontSize: 13, fontWeight: 600, marginBottom: 4 } }, t.batchTitle),
            h('div', { className: 'ta-note' }, t.batchHint)),
          h('a', { className: 'ta-btn sm', href: `${API()}?template=1` }, t.downloadTemplate)),

        h('div', { className: 'ta-row' },
          h('input', {
            type: 'file', ref: fileRef, accept: '.xlsx,.csv',
            style: { display: 'none' }, onChange: onFile,
          }),
          h('button', { className: 'ta-btn', disabled: busy || running, onClick: () => fileRef.current && fileRef.current.click() },
            busy ? t.parsing : t.chooseFile),
          fileName ? h('span', { className: 'ta-chip' }, fileName) : null,
          rows.length ? h('span', { className: 'ta-chip' }, `${rows.length} ${t.rows}`) : null,
          h('div', { className: 'ta-grow' }),
          rows.length
            ? h('button', { className: 'ta-btn primary', disabled: busy || running, onClick: start }, running ? t.batchRunning : t.startBatch)
            : null),

        rows.length
          ? h('table', { className: 'ta-table' },
            h('thead', null, h('tr', null,
              h('th', null, '#' ), h('th', null, t.colName), h('th', null, t.colSpec),
              h('th', null, t.colBudget), h('th', null, t.colQty))),
            h('tbody', null, ...rows.slice(0, 12).map((row) => h('tr', { key: row.no },
              h('td', null, String(row.no)),
              h('td', null, row.name),
              h('td', null, row.spec || '—'),
              h('td', null, row.budget ? `¥${row.budget}` : '—'),
              h('td', null, String(row.qty || 1)))))
            )
          : null,

        note ? h('div', { className: `ta-note ${bad ? 'bad' : ''}` }, note) : null,

        batch && (running || batch.done > 0)
          ? h('div', null,
            h('div', { className: 'ta-row', style: { marginBottom: 6 } },
              h('span', { className: 'ta-note' }, `${batch.done} / ${batch.total}${batch.current ? ` · ${batch.current}` : ''}`),
              h('div', { className: 'ta-grow' }),
              running ? h('span', { className: 'ta-note' }, t.batchRunning) : null),
            h('div', { className: 'ta-progress' }, h('i', { style: { width: `${percent}%` } })))
          : null,

        batch?.error ? h('div', { className: 'ta-note bad' }, batch.error) : null,

        batch?.file
          ? h('div', { className: 'ta-row' },
            h('a', { className: 'ta-btn primary', href: `${API()}?file=${encodeURIComponent(batch.file)}` }, t.downloadResult),
            h('button', {
              className: 'ta-btn sm quiet',
              onClick: () => rpc('revealExports').catch(() => {}),
            }, en ? 'Show folder' : '打开文件夹'),
            h('span', { className: 'ta-note', style: { wordBreak: 'break-all' } }, batch.path || batch.file))
          : null)
    }

    function Panel() {
      const [status, setStatus] = useState(null)
      const [analysis, setAnalysis] = useState(null)
      const [model, setModel] = useState('')
      const [draft, setDraft] = useState('')
      const [busy, setBusy] = useState(false)
      const [error, setError] = useState('')
      const [needLogin, setNeedLogin] = useState(false)
      const [sort, setSort] = useState('smart')
      const [detail, setDetail] = useState({ id: '', text: '' })
      const [ask, setAsk] = useState(null)
      const [askNote, setAskNote] = useState('')
      const [askBusy, setAskBusy] = useState(false)
      const [confirmSwitch, setConfirmSwitch] = useState(false)
      const [brand, setBrand] = useState('all')
      const [facetSel, setFacetSel] = useState({})
      const [tab, setTab] = useState('single')
      const [cdpVisible, setCdpVisible] = useState(false)
      const [outdated, setOutdated] = useState(false)
      const [maxHeight, setMaxHeight] = useState(0)
      const inputRef = useRef(null)
      const restored = useRef(false)
      const rootRef = useRef(null)

      // The panel must scroll with the wheel inside whatever height the shell gives it.
      useEffect(() => {
        const measure = () => {
          const node = rootRef.current
          if (!node) return
          const top = node.getBoundingClientRect().top
          const available = Math.max(360, Math.floor(window.innerHeight - Math.max(0, top) - 6))
          setMaxHeight((current) => (Math.abs(current - available) > 2 ? available : current))
        }
        measure()
        const timers = [setTimeout(measure, 250), setTimeout(measure, 900), setTimeout(measure, 2000)]
        window.addEventListener('resize', measure)
        let observer
        if (typeof ResizeObserver === 'function' && document.body) {
          observer = new ResizeObserver(measure)
          observer.observe(document.body)
        }
        return () => {
          timers.forEach((timer) => clearTimeout(timer))
          window.removeEventListener('resize', measure)
          if (observer) observer.disconnect()
        }
      }, [])

      const refresh = async () => {
        try {
          const result = await rpc('status')
          setStatus(result.status || null)
          if (result.status?.build && result.status.build !== t.buildTag) setOutdated(true)
          if (result.state?.model) { setModel(result.state.model); setDraft(result.state.model) }
          if (!restored.current && result.state?.analysis) {
            restored.current = true
            setAnalysis(result.state.analysis)
          }
          if (result.status?.loggedIn) setNeedLogin(false)
        } catch (err) {
          const message = String(err.message || err)
          setStatus({ browser: false, loggedIn: false, error: message })
          setError(`插件宿主接口不可用（${message}）。请到「插件」页把「淘宝选型助手」关掉再打开一次。`)
        }
      }

      useEffect(() => { refresh() }, [])
      useEffect(() => {
        const timer = setInterval(() => { if (!analysis) refresh() }, 8000)
        return () => clearInterval(timer)
      }, [analysis])

      const search = async (value) => {
        const query = String(value || '').trim()
        if (!query || busy) return
        setBusy(true)
        setError('')
        setNeedLogin(false)
        setDetail({ id: '', text: '' })
        try {
          const result = await rpc('search', { query })
          if (!result.ok) {
            setError(result.reason || '搜索失败')
            setNeedLogin(Boolean(result.needLogin))
          } else {
            setAnalysis(result.state.analysis)
            setModel(result.state.model)
            setDraft(result.state.model)
            setBrand('all')
            setFacetSel({})
            setSort('smart')
          }
        } catch (err) {
          setError(String(err.message || err))
        } finally {
          setBusy(false)
          refresh()
        }
      }

      const openItem = async (item) => {
        try {
          const result = await rpc('openItem', { url: item.url })
          if (!result.ok) setError(result.reason || '打开失败')
          else if (result.reason) setError(result.reason)
        } catch (err) { setError(String(err.message || err)) }
      }

      const toggleDetail = async (item) => {
        if (detail.id === item.id) { setDetail({ id: '', text: '' }); return }
        setDetail({ id: item.id, text: '读取中…' })
        try {
          const result = await rpc('detail', { url: item.url })
          const data = result.detail || {}
          setDetail({ id: item.id, text: [data.title, data.price ? `¥${data.price}` : '', data.snippet || ''].filter(Boolean).join('\n') })
        } catch (err) {
          setDetail({ id: item.id, text: String(err.message || err) })
        }
      }

      const openAsk = async (item) => {
        setAsk({ item, text: '' })
        setAskNote('')
        try {
          const result = await rpc('askSeller', { url: item.url })
          setAsk({ item, text: result.question || '' })
        } catch (err) { setAskNote(String(err.message || err)) }
      }

      const sendAsk = async () => {
        if (!ask) return
        setAskBusy(true)
        setAskNote(t.sending)
        try {
          const result = await rpc('askSeller', { url: ask.item.url, question: ask.text })
          const steps = (result.steps || []).map((step) => `${step.step}${step.ok === false || step.found === false ? ' ✗' : ' ✓'}`).join('　')
          setAskNote(`${result.note || ''}\n${steps}`)
        } catch (err) {
          setAskNote(String(err.message || err))
        } finally { setAskBusy(false) }
      }

      const changeModel = async () => {
        try { await rpc('clearModel') } catch { /* ignore */ }
        setAnalysis(null)
        setModel('')
        setDraft('')
        setError('')
        setBrand('all')
        setFacetSel({})
        setDetail({ id: '', text: '' })
        if (inputRef.current) inputRef.current.focus()
      }

      const loggedIn = Boolean(status?.loggedIn)
      const items = analysis?.items || []
      const ranks = {}
      if (analysis?.ranks) {
        ranks[analysis.ranks.cheapest] = 'cheapest'
        ranks[analysis.ranks.value] = 'value'
        ranks[analysis.ranks.performance] = 'performance'
      }
      const sorted = sort === 'smart'
        ? items
        : sort === 'price'
          ? [...items].sort((a, b) => a.price - b.price)
          : [...items].sort((a, b) => (b.sales || 0) - (a.sales || 0))
      const brandOptions = analysis && Array.isArray(analysis.brands) ? analysis.brands : []
      const brandItems = brand === 'all' ? items : items.filter((item) => item.brand === brand)
      const facetGroups = (() => {
        const buckets = new Map()
        for (const item of brandItems) {
          for (const [key, values] of Object.entries(item.facets || {})) {
            if (!buckets.has(key)) buckets.set(key, new Map())
            const bucket = buckets.get(key)
            for (const value of values) bucket.set(value, (bucket.get(value) || 0) + 1)
          }
        }
        const labels = { poles: t.facetPoles, amp: t.facetAmp, power: t.facetPower, voltage: t.facetVoltage, storage: t.facetStorage }
        return [...buckets.entries()]
          .map(([key, bucket]) => ({
            key,
            label: labels[key] || key,
            values: [...bucket.entries()]
              .map(([value, count]) => ({ value, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 10),
          }))
          .filter((group) => group.values.length > 1)
      })()
      const matchesFacets = (item) => Object.entries(facetSel)
        .every(([key, value]) => !value || (Array.isArray(item.facets?.[key]) && item.facets[key].includes(value)))
      const filtered = (brand === 'all' ? sorted : sorted.filter((item) => item.brand === brand)).filter(matchesFacets)
      const visible = filtered
      const hasFilter = brand !== 'all' || Object.values(facetSel).some(Boolean)

      return h('div', {
        className: 'ta-root',
        ref: rootRef,
        style: {
          position: 'relative',
          height: '100%',
          maxHeight: maxHeight ? `${maxHeight}px` : undefined,
        },
      },
        h('style', { key: 'ta-css' }, css),
        h('div', { className: 'ta-top' },
          h('div', { className: 'ta-brand' },
            h(Glyph, { size: 22 }),
            h('div', null,
              h('h1', null, t.title),
              h('p', null, `${t.subtitle} · ${t.buildTag}`))),
          h('div', { className: 'ta-grow' }),
          h('div', { className: 'ta-tabs2' },
            h('button', { className: tab === 'single' ? 'on' : '', onClick: () => setTab('single') }, t.singleTab),
            h('button', { className: tab === 'batch' ? 'on' : '', onClick: () => setTab('batch') }, t.batchTab)),
          h('button', {
            className: 'ta-btn sm quiet',
            title: en ? 'Reload this page to pick up a new plugin build' : '重新加载界面，用于加载更新后的插件界面',
            onClick: () => { window.location.reload() },
          }, t.reloadUi),
          h('span', { className: 'ta-pill' },
            h('span', { className: `ta-dot ${loggedIn ? 'ok' : status?.browser ? 'warn' : ''}` }),
            status === null ? t.checking : loggedIn ? `${t.signedIn}${status.nick ? ` · ${status.nick}` : ''}` : t.signedOut),
          h('button', {
            className: 'ta-btn sm quiet',
            title: en ? 'Show the automation browser to clear a slider' : '需要人工过滑块时，把后台浏览器显示出来',
            onClick: () => rpc('showBrowser', { visible: !cdpVisible })
              .then((result) => { if (result?.ok) setCdpVisible(Boolean(result.visible)) })
              .catch(() => {}),
          }, cdpVisible ? t.hideBrowser : t.showBrowser),
          h('button', {
            className: 'ta-btn sm quiet',
            onClick: () => { if (loggedIn) setConfirmSwitch(true); else rpc('login').then(refresh).catch(() => {}) },
          }, loggedIn ? t.switchAccount : t.openWindow)),

        h('div', { className: 'ta-scroll' },
          h('div', { className: 'ta-wrap' },
            outdated
              ? h('div', { className: 'ta-banner warn', style: { marginTop: 14 } },
                h('div', { className: 'ta-grow' }, `${t.outdated}（页面 ${t.buildTag}｜宿主 ${status?.build || '?'}）`),
                h('button', {
                  className: 'ta-btn sm primary',
                  onClick: () => { window.location.reload() },
                }, t.reloadNow))
              : null,
            tab === 'single'
              ? h('div', { className: 'ta-searchrow' },
                h('input', {
                  className: 'ta-input grow', ref: inputRef, value: draft, placeholder: t.searchPlaceholder,
                  disabled: busy,
                  onChange: (event) => setDraft(event.target.value),
                  onKeyDown: (event) => { if (event.key === 'Enter') search(draft) },
                }),
                h('button', { className: 'ta-btn primary ta-searchbtn', disabled: busy || !draft.trim(), onClick: () => search(draft) },
                  busy ? t.searching : t.search))
              : h('div', { style: { height: 16 } }),

            needLogin
              ? h('div', { className: 'ta-banner warn' },
                h('div', { className: 'ta-grow' }, t.loginFirst),
                h('button', { className: 'ta-btn sm', onClick: () => setNeedLogin(false) }, t.close))
              : null,

            error
              ? h('div', { className: 'ta-banner err' },
                h('div', { className: 'ta-grow' }, error),
                h('button', { className: 'ta-btn sm quiet', onClick: () => search(draft) }, t.retry))
              : null,

            loggedIn
              ? (tab === 'batch'
                ? h(BatchPanel, null)
                : (analysis
                ? h('div', null,
                  h('div', { className: 'ta-summary' },
                    h('span', { className: 'ta-chip' }, h('b', null, analysis.model || model)),
                    h('span', { className: 'ta-chip' }, `${analysis.stats.count} ${t.items}`),
                    h('span', { className: 'ta-chip' }, `${t.range} ¥${analysis.stats.min}–¥${analysis.stats.max}`),
                    h('span', { className: 'ta-chip' }, `${t.median} ¥${analysis.stats.median}`),
                    analysis.excludedCount ? h('span', { className: 'ta-chip' }, `${analysis.excludedCount + (analysis.irrelevant || 0)} ${t.excluded}`) : null,
                    h('button', { className: 'ta-btn sm quiet', onClick: changeModel }, t.changeModel)),
                  h('div', { className: 'ta-decision' }, analysis.decision),
                  h(Picks, { analysis, onOpen: openItem }),
                  brandOptions.length > 1
                    ? h('div', { className: 'ta-brandbar' },
                      h('button', {
                        className: `ta-chipbtn ${brand === 'all' ? 'on' : ''}`,
                        onClick: () => setBrand('all'),
                      }, `${t.allBrands} ${items.length}`),
                      ...brandOptions.map((option) => h('button', {
                        key: option.name,
                        className: `ta-chipbtn ${brand === option.name ? 'on' : ''}`,
                        onClick: () => setBrand(option.name),
                      }, `${option.name} ${option.count}`)),
                      hasFilter
                        ? h('button', {
                          className: 'ta-chipbtn',
                          onClick: () => { setBrand('all'); setFacetSel({}) },
                        }, t.clearFilters)
                        : null)
                    : null,
                  facetGroups.length > 0
                    ? h('div', { className: 'ta-facets' },
                      ...facetGroups.map((group) => h('div', { className: 'ta-facetrow', key: group.key },
                        h('span', { className: 'ta-facetlabel' }, group.label),
                        ...group.values.map((option) => h('button', {
                          key: option.value,
                          className: `ta-chipbtn ${facetSel[group.key] === option.value ? 'on' : ''}`,
                          onClick: () => setFacetSel((current) => ({
                            ...current,
                            [group.key]: current[group.key] === option.value ? '' : option.value,
                          })),
                        }, `${option.value} ${option.count}`)))))
                    : null,
                  h('div', { className: 'ta-listhead' },
                    h('span', { className: 'ta-label' }, hasFilter ? `${visible.length} / ${items.length}` : `${items.length} ${t.items}`),
                    h('div', { className: 'ta-grow' }),
                    h('div', { className: 'ta-seg' },
                      h('button', { className: sort === 'smart' ? 'on' : '', onClick: () => setSort('smart') }, t.sortSmart),
                      h('button', { className: sort === 'price' ? 'on' : '', onClick: () => setSort('price') }, t.sortPrice),
                      h('button', { className: sort === 'sales' ? 'on' : '', onClick: () => setSort('sales') }, t.sortSales))),
                  h('div', { className: 'ta-items' },
                    ...visible.map((item) => h(Item, {
                      key: item.id,
                      item,
                      rank: ranks[item.id],
                      detail: detail.id === item.id ? detail.text : '',
                      onOpen: openItem,
                      onAsk: openAsk,
                      onDetail: toggleDetail,
                    }))),
                  analysis.stats.count === 0
                    ? h('div', { className: 'ta-empty' }, h(Glyph, { size: 30 }), t.noMatch)
                    : null)
                : h('div', { className: 'ta-empty' }, h(Glyph, { size: 30 }), h('div', null, t.noResults))))
              : h(LoginCard, { onDone: refresh }),

            h('div', { style: { height: 8 } }))),

        ask
          ? h('div', { className: 'ta-mask', onClick: (event) => { if (event.target === event.currentTarget) setAsk(null) } },
            h('div', { className: 'ta-modal' },
              h('h3', null, t.askTitle),
              h('div', { className: 'ta-target' }, ask.item.title),
              h('textarea', { value: ask.text, onChange: (event) => setAsk({ item: ask.item, text: event.target.value }) }),
              askNote ? h('div', { className: 'ta-steps' }, askNote) : null,
              h('div', { className: 'ta-foot' },
                h('button', {
                  className: 'ta-btn sm quiet',
                  onClick: () => openItem(ask.item),
                }, t.open),
                h('button', { className: 'ta-btn sm quiet', onClick: () => setAsk(null) }, t.close),
                h('button', { className: 'ta-btn sm primary', disabled: askBusy || !ask.text.trim(), onClick: sendAsk }, t.send))))
          : null,

        confirmSwitch
          ? h('div', { className: 'ta-mask', onClick: (event) => { if (event.target === event.currentTarget) setConfirmSwitch(false) } },
            h('div', { className: 'ta-modal' },
              h('h3', null, en ? 'Sign out to switch account?' : '换账号要先退出当前登录'),
              h('div', { className: 'ta-target' }, en
                ? 'The plugin browser drops its Taobao cookies and opens the login page. Your normal Edge is not touched.'
                : '会清除插件浏览器里的淘宝登录，然后打开登录页重新扫码或短信登录。你自己日常用的 Edge 不受影响。'),
              h('div', { className: 'ta-foot' },
                h('button', { className: 'ta-btn sm quiet', onClick: () => setConfirmSwitch(false) }, t.close),
                h('button', {
                  className: 'ta-btn sm primary',
                  onClick: async () => {
                    setConfirmSwitch(false)
                    try {
                      await rpc('switchAccount')
                      setAnalysis(null)
                      setModel('')
                      setDraft('')
                    } catch { /* surface through refresh */ }
                    refresh()
                  },
                }, en ? 'Switch' : '确认退出'))))
          : null)
    }

    return {
      inject: ['slots'],
      apply(ctx) {
        try {
          // Styles are rendered as a <style> element inside the panel: the bundle
          // has no `styles` helper, and a silent no-op guard is exactly why an
          // unstyled panel shipped once.
          ctx.slots.inject('main', () => ctx.slots.register(
            { name: 'main', key: 'taobao-advisor' },
            Panel,
          ))

          ctx.slots.inject('sidebar.panellist', () => ctx.slots.register(
            { name: 'sidebar.panellist', id: 'taobao-advisor', order: 20, label: () => t.title },
            Glyph,
          ))
        } catch (error) {
          // A throw here would surface as a fatal "entry did not activate" boot error.
          console.error('[taobao-advisor] client activation failed', error)
        }
      },
    }
  },
})
}
