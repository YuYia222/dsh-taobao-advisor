/**
 * Deterministic scoring for Taobao search results.
 * Every number here is explainable, so the panel can show why an item won.
 */

const ACCESSORY_WORDS = [
  '手机壳', '保护壳', '保护套', '贴膜', '钢化膜', '水凝膜', '手机膜', '膜', '数据线', '充电线',
  '充电器', '充电头', '耳机套', '支架', '挂绳', '指环', '镜头膜', '防尘塞', '散热器', '配件',
  '碎屏', '主板', '屏幕总成', '电池更换', '延保', '碎屏保', '换新服务', '回收', '适用', '通用',
]

/** Listings whose headline price is a monthly installment, not the phone price. */
const INSTALLMENT_WORDS = ['分期', '月付', '每月', '月供', '首月', '免息', '白条', '信用付', '低至', '押金']

/** Listings that are not a new retail unit. */
const RISK_WORDS = ['二手', '资源机', '官换', '翻新', '展示机', '样机', '组装', '卡贴', '有锁', '权益机', '维修机']

/** Parallel-import / grey-market markers. */
const GREY_WORDS = ['港版', '美版', '日版', '韩版', '欧版', '澳版', '水货', '海外版']

const PERF_WEIGHTS = [
  { pattern: /ultra|至尊|非凡大师/i, weight: 14 },
  { pattern: /pro\s*max|promax|17pm|max\b/i, weight: 11 },
  { pattern: /pro\b/i, weight: 8 },
  { pattern: /plus\b|air\b/i, weight: 4 },
  { pattern: /ti\b|super\b/i, weight: 5 },
  { pattern: /旗舰|顶配|满血版|高配|官方正品|自营/i, weight: 4 },
  { pattern: /rtx\s*50\d0|rtx\s*40\d0|m[1-5]\s*(pro|max)?|i[579]-1[3-9]\d{3}/i, weight: 6 },
]

const STORAGE_RE = /(\d+)\s*(gb|g|t|tb)\b/i
const RAM_RE = /(\d+)\s*(gb|g)\s*(?:\+|\/|内存|ram)/i

export function parseSpec(title) {
  const text = String(title || '')
  const storageMatch = text.match(STORAGE_RE)
  const ramMatch = text.match(RAM_RE)
  let storage = 0
  if (storageMatch) {
    const value = Number(storageMatch[1])
    storage = /t/i.test(storageMatch[2]) ? value * 1024 : value
  }
  const ram = ramMatch ? Number(ramMatch[1]) : 0
  return { storage, ram }
}

function hasAny(text, words) {
  return words.some((word) => text.includes(word))
}

const IGNORED_WORDS = new Set(['gb', 'tb', 'g', 't', 'the', 'and', 'for', 'with'])

/** Canonical brand → headline/shop aliases. Order matters: first hit wins. */
const BRAND_ALIASES = [
  ['Apple', ['apple', 'iphone', 'ipad', 'macbook', 'airpods', '苹果']],
  ['华为', ['huawei', '华为', 'mate', 'pura', 'nova']],
  ['荣耀', ['honor', '荣耀']],
  ['小米', ['xiaomi', '小米', 'redmi', '红米', 'miui']],
  ['三星', ['samsung', '三星', 'galaxy']],
  ['OPPO', ['oppo', 'find x', 'reno']],
  ['vivo', ['vivo', 'iqoo']],
  ['一加', ['oneplus', '一加']],
  ['realme', ['realme', '真我']],
  ['联想', ['lenovo', '联想', 'thinkpad', '拯救者', 'legion']],
  ['戴尔', ['dell', '戴尔', 'alienware', '外星人']],
  ['华硕', ['asus', '华硕', 'rog', '天选']],
  ['惠普', ['hp', '惠普', '暗影精灵']],
  ['宏碁', ['acer', '宏碁', '掠夺者']],
  ['微星', ['msi', '微星']],
  ['机械革命', ['机械革命', 'mechrevo']],
  ['索尼', ['sony', '索尼', 'playstation', 'ps5']],
  ['佳能', ['canon', '佳能']],
  ['尼康', ['nikon', '尼康']],
  ['富士', ['fujifilm', '富士']],
  ['大疆', ['dji', '大疆']],
  ['任天堂', ['nintendo', '任天堂', 'switch']],
  ['罗技', ['logitech', '罗技']],
  ['雷蛇', ['razer', '雷蛇']],
  ['英特尔', ['intel', '英特尔']],
  ['AMD', ['amd', '锐龙', 'ryzen', 'radeon']],
  ['英伟达', ['nvidia', '英伟达', 'geforce', 'rtx']],
  ['海尔', ['haier', '海尔']],
  ['美的', ['midea', '美的']],
  ['格力', ['gree', '格力']],
  ['戴森', ['dyson', '戴森']],
  ['安踏', ['anta', '安踏']],
  ['李宁', ['李宁', 'li-ning', 'lining']],
  ['耐克', ['nike', '耐克']],
  ['阿迪达斯', ['adidas', '阿迪']],
  ['正泰', ['正泰', 'chnt']],
  ['施耐德', ['施耐德', 'schneider', 'apc']],
  ['德力西', ['德力西', 'delixi']],
  ['西门子', ['西门子', 'siemens']],
  ['ABB', ['abb']],
  ['公牛', ['公牛', 'bull']],
  ['天正', ['天正', 'tengen']],
  ['良信', ['良信', 'nader']],
  ['欧姆龙', ['欧姆龙', 'omron']],
  ['台达', ['台达', 'delta']],
  ['汇川', ['汇川', 'inovance']],
  ['富士', ['富士', 'fuji']],
  ['三菱', ['三菱', 'mitsubishi']],
  ['松下', ['松下', 'panasonic']],
  ['安川', ['安川', 'yaskawa']],
]

const UNKNOWN_BRAND = '其他'

/** Best-effort brand from the headline plus the shop name. */
export function detectBrand(title, shop) {
  const text = `${title || ''} ${shop || ''}`.toLowerCase()
  for (const [brand, aliases] of BRAND_ALIASES) {
    if (aliases.some((alias) => text.includes(alias))) return brand
  }
  return UNKNOWN_BRAND
}

/**
 * Structured specs a buyer filters by. Each key holds every value the headline
 * mentions, because a listing such as "1P2P3P4P" really does sell all of them —
 * filtering by "3P" must find it.
 */
export function extractFacets(title) {
  const text = String(title || '')
  const facets = {}

  const poleMatches = [...text.matchAll(/([1-4])\s*P\s*(?:\+\s*N)?/gi)].map((match) =>
    /\+\s*N/i.test(match[0]) ? `${match[1]}P+N` : `${match[1]}P`)
  const cnPoles = [...text.matchAll(/([一二三四])\s*极/g)].map((match) => `${'一二三四'.indexOf(match[1]) + 1}P`)
  const poles = [...new Set([...poleMatches, ...cnPoles])]
  if (poles.length > 0) facets.poles = poles

  const curveMatches = [...text.matchAll(/(?:^|[^A-Za-z0-9])([BCD])\s*(\d{1,3})(?![0-9])/gi)]
    .map((match) => `${match[1].toUpperCase()}${match[2]}`)
  const plainAmps = [...text.matchAll(/(\d{1,3})\s*A(?![A-Za-z])/g)].map((match) => `${match[1]}A`)
  const amps = [...new Set(curveMatches.length ? curveMatches : plainAmps)]
  if (amps.length > 0) facets.amp = amps

  const power = [...new Set([...text.matchAll(/(\d+(?:\.\d+)?)\s*(KW|W)(?![A-Za-z])/gi)].map((match) => `${match[1]}${match[2].toUpperCase()}`))]
  if (power.length > 0) facets.power = power

  const voltage = [...new Set([...text.matchAll(/(\d{3,4})\s*V(?![A-Za-z])/gi)].map((match) => `${match[1]}V`))]
  if (voltage.length > 0) facets.voltage = voltage

  const { storage } = parseSpec(text)
  if (storage) facets.storage = [`${storage}G`]

  return facets
}

/** Words that name the same product family in Chinese and English listings. */
const ALIAS_GROUPS = [
  ['iphone', '苹果', 'apple', 'iphone手机'],
  ['ipad', '苹果', 'apple'],
  ['macbook', '苹果', 'apple'],
  ['airpods', '苹果', 'apple'],
  ['xiaomi', '小米', 'redmi', '红米'],
  ['huawei', '华为'],
  ['samsung', '三星', 'galaxy'],
  ['lenovo', '联想', 'thinkpad'],
  ['asus', '华硕'],
  ['dell', '戴尔'],
]

function latinWords(text) {
  return (String(text).toLowerCase().match(/[a-z]{2,}/g) || []).filter((word) => !IGNORED_WORDS.has(word))
}

function generationNumbers(text) {
  const flat = String(text).toLowerCase().replace(/\s+/g, '')
  const out = []
  const pattern = /(\d{1,4})(g|gb|t|tb|寸|英寸|元|万|人|天|期|年|mm|cm)?/g
  let match = pattern.exec(flat)
  while (match) {
    if (!match[2]) out.push(match[1])
    match = pattern.exec(flat)
  }
  return out
}

/**
 * Whether a listing headline actually names the requested model.
 * Prevents "iPhone 15/16 Pro" and cross-model bait from winning the comparison.
 */
function cjkBigrams(text) {
  const runs = String(text || '').match(/[\u4e00-\u9fa5]{2,}/g) || []
  const grams = []
  for (const run of runs) {
    for (let i = 0; i < run.length - 1; i += 1) grams.push(run.slice(i, i + 2))
  }
  return grams
}

/**
 * Whether a listing headline names the requested model. Deliberately forgiving:
 * "三相异步电机" must still match "三相异步电动机", and a power like "7.5kw"
 * must not be treated as a model generation.
 */
export function matchesModel(title, query) {
  if (!query) return true
  const text = String(title || '').toLowerCase()
  const flat = text.replace(/\s+/g, '')
  const queryFlat = String(query).toLowerCase().replace(/\s+/g, '')
  const compact = queryFlat.replace(/[^a-z0-9\u4e00-\u9fa5]/g, '')

  // Fast path: the query appears as one run, e.g. "iphone17pro" or "小米15".
  if (compact && flat.includes(compact)) return true

  // Chinese product names: most two-character pieces must appear.
  const gramList = cjkBigrams(queryFlat)
  if (gramList.length > 0) {
    const hits = gramList.filter((gram) => flat.includes(gram)).length
    if (hits / gramList.length < 0.6) return false
  }

  for (const word of latinWords(query)) {
    const group = ALIAS_GROUPS.find((aliases) => aliases.includes(word))
    if (group) {
      if (!group.some((alias) => text.includes(alias) || flat.includes(alias))) return false
    } else if (!text.includes(word)) return false
  }

  // A generation number only matters for latin model queries ("17 Pro"),
  // never for spec numbers such as "7.5kw".
  if (latinWords(query).length > 0) {
    const numbers = generationNumbers(query)
    if (numbers.length > 0 && !flat.includes(numbers[0])) return false
  }
  return true
}

export function classify(title, shop) {
  const text = `${title || ''} ${shop || ''}`
  return {
    accessory: hasAny(text, ACCESSORY_WORDS),
    installment: hasAny(text, INSTALLMENT_WORDS),
    risk: hasAny(text, RISK_WORDS),
    grey: hasAny(text, GREY_WORDS),
  }
}

export function isAccessory(title) {
  return classify(title).accessory
}

export function performanceScore(item) {
  const title = String(item.title || '')
  const flags = item.flags || classify(title)
  let score = 40
  for (const rule of PERF_WEIGHTS) {
    if (rule.pattern.test(title)) score += rule.weight
  }
  const { storage, ram } = parseSpec(title)
  if (storage) score += Math.min(10, storage / 128)
  if (ram) score += Math.min(8, ram / 4)
  if (item.tmall) score += 3
  if (/官方|旗舰店|自营|授权/.test(title) || /官方|旗舰店|自营/.test(String(item.shop || ''))) score += 3
  if (flags.grey) score -= 6
  if (flags.risk) score -= 25
  if (flags.accessory) score -= 45
  return Math.round(score * 10) / 10
}

export function valueScore(item) {
  const performance = performanceScore(item)
  const price = Math.max(1, Number(item.price) || 1)
  const sales = Math.max(0, Number(item.sales) || 0)
  const score = (performance * Math.log10(sales + 10)) / Math.pow(price, 0.42)
  return Math.round(score * 1000) / 1000
}

function median(values) {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2
}

export function analyze(items, { model = '' } = {}) {
  const enriched = items.map((item) => {
    const flags = classify(item.title, item.shop)
    const next = {
      ...item,
      flags,
      brand: detectBrand(item.title, item.shop),
      relevant: model ? matchesModel(item.title, model) : true,
    }
    next.performance = performanceScore(next)
    next.value = valueScore(next)
    next.spec = parseSpec(item.title)
    next.facets = extractFacets(item.title)
    // "0.75/1.1/1.5/2.2/3/4/5.5" means one listing sells many specs, and the
    // headline price belongs to its smallest one.
    next.multiSku = /\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?){2,}/.test(String(item.title || ''))
    return next
  })

  // Everything stays visible; only the confidence pool feeds the recommendations.
  const relevant = enriched.filter((item) => item.relevant)
  const irrelevant = enriched.length - relevant.length

  const brandCounts = new Map()
  for (const item of relevant) brandCounts.set(item.brand, (brandCounts.get(item.brand) || 0) + 1)
  const brands = [...brandCounts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // Spec facets for the second filter row (极数 / 电流 / 功率 / 容量 / 电压).
  const FACET_LABELS = { poles: '极数', amp: '电流', power: '功率', voltage: '电压', storage: '容量' }
  const facetBuckets = new Map()
  for (const item of relevant) {
    for (const [key, values] of Object.entries(item.facets || {})) {
      if (!facetBuckets.has(key)) facetBuckets.set(key, new Map())
      const bucket = facetBuckets.get(key)
      for (const value of values) bucket.set(value, (bucket.get(value) || 0) + 1)
    }
  }
  const facets = [...facetBuckets.entries()]
    .map(([key, bucket]) => ({
      key,
      label: FACET_LABELS[key] || key,
      values: [...bucket.entries()].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count),
    }))
    .filter((group) => group.values.length > 1)

  // Accessories, services and installment listings are never candidates.
  const devices = enriched.filter((item) => !item.flags.accessory && !item.flags.installment)
  const devicePrices = devices.map((item) => item.price).filter((price) => price > 0)
  const deviceMedian = median(devicePrices)

  // A price far below the median is a deposit, a bait SKU, or a different model.
  const sane = devices.filter((item) => !(deviceMedian > 0 && item.price < deviceMedian * 0.55))
  // A listing nobody has bought is usually a placeholder price for one SKU; prefer sold ones.
  const active = sane.filter((item) => (item.sales || 0) > 0)
  const base = active.length >= 3 ? active : sane
  const trusted = base.filter((item) => !item.flags.risk)
  const pool = trusted.length >= 3 ? trusted : base

  const prices = pool.map((item) => item.price)
  // A listing that advertises a whole range of specs shows its cheapest SKU price,
  // which is not the price of the spec the user asked for.
  const focused = pool.filter((item) => !item.multiSku)
  const pickPool = focused.length > 0 ? focused : pool
  const cheapest = [...pickPool].sort((a, b) => a.price - b.price)[0] ?? null
  const value = [...pickPool].sort((a, b) => b.value - a.value)[0] ?? null
  const performance = [...pickPool].sort((a, b) => (b.performance - a.performance) || (a.price - b.price))[0] ?? null

  const stats = {
    count: pool.length,
    total: items.length,
    min: prices.length ? Math.min(...prices) : 0,
    max: prices.length ? Math.max(...prices) : 0,
    median: median(prices),
  }

  const excluded = relevant.length - pool.length

  const decision = (() => {
    if (!cheapest) {
      return relevant.length === 0
        ? '这批结果里没有能确认是同一型号的链接，下面是原始搜索结果，可以自己挑；把型号写得更完整（品牌 + 系列 + 功率/容量）识别会更准。'
        : '这次搜到的基本是配件或服务类商品，没拿到可比的机器报价。请换一个型号或补充配置关键词再试。'
    }
    if (value && cheapest.id === performance.id) {
      return `「${short(cheapest.title)}」同时是最低价和最高性能，直接选它即可。`
    }
    const parts = [`最便宜的是「${short(cheapest.title)}」¥${cheapest.price}`]
    if (value && value.id !== cheapest.id) parts.push(`性价比最高是「${short(value.title)}」¥${value.price}（${value.salesText || '销量未知'}）`)
    if (performance && performance.id !== cheapest.id) parts.push(`规格最强是「${short(performance.title)}」¥${performance.price}`)
    return `${parts.join('；')}。`
  })()

  return {
    model,
    items: enriched,
    pool,
    ranks: {
      cheapest: cheapest ? cheapest.id : null,
      value: value ? value.id : null,
      performance: performance ? performance.id : null,
    },
    picks: { cheapest, value, performance },
    stats,
    decision,
    brands,
    facets,
    accessoryCount: enriched.filter((item) => item.flags.accessory || item.flags.installment).length,
    excludedCount: excluded,
    irrelevant,
  }
}

export function short(title, max = 34) {
  const text = String(title || '').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max)}…` : text
}

export function suggestQuestion(model, item) {
  const spec = parseSpec(item.title)
  const storage = spec.storage ? `${spec.storage}G` : '该型号'
  return `你好，我看到商品「${short(item.title, 28)}」，想确认几点：1) 是全新正品、支持全国联保吗？2) ${storage} 版本是否有现货、实付价多少？3) 支持 7 天无理由退换吗？谢谢。`
}

export function buildReport(analysis) {
  const lines = []
  lines.push(`型号：${analysis.model || '未指定'}｜共 ${analysis.stats.count} 个可比价商品（另有 ${analysis.excludedCount + (analysis.irrelevant || 0)} 个不匹配/配件/分期/异常低价结果已排除）`)
  lines.push(`价格区间：¥${analysis.stats.min} - ¥${analysis.stats.max}，中位价 ¥${analysis.stats.median}`)
  lines.push(`结论：${analysis.decision}`)
  for (const key of ['cheapest', 'value', 'performance']) {
    const pick = analysis.picks[key]
    if (!pick) continue
    const label = key === 'cheapest' ? '最便宜' : key === 'value' ? '性价比最高' : '性能最强'
    lines.push(`- ${label}：${pick.title}｜¥${pick.price}｜${pick.salesText || '销量未知'}｜${pick.shop || '店铺未知'}｜${pick.url}`)
  }
  return lines.join('\n')
}
