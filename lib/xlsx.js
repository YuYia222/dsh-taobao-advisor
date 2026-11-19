/**
 * Dependency-free XLSX writer/reader.
 * A workbook is a ZIP of XML parts; this module emits and parses exactly the
 * subset a comparison report needs: inline/number cells, several sheets, one
 * bold header style.
 */
import { deflateRawSync, inflateRawSync } from 'node:zlib'

/* ---------------------------------- zip ---------------------------------- */

const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let i = 0; i < 256; i += 1) {
    let value = i
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
    table[i] = value
  }
  return table
})()

function crc32(buffer) {
  let crc = -1
  for (let i = 0; i < buffer.length; i += 1) crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ -1) >>> 0
}

function zip(entries) {
  const chunks = []
  const central = []
  let offset = 0
  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8')
    const data = entry.data
    const compressed = deflateRawSync(data)
    const crc = crc32(data)
    const local = Buffer.alloc(30)
    local.writeUInt32LE(0x04034b50, 0)
    local.writeUInt16LE(20, 4)
    local.writeUInt16LE(0x0800, 6)
    local.writeUInt16LE(8, 8)
    local.writeUInt32LE(crc, 14)
    local.writeUInt32LE(compressed.length, 18)
    local.writeUInt32LE(data.length, 22)
    local.writeUInt16LE(name.length, 26)
    chunks.push(local, name, compressed)
    central.push({ name, crc, compressed: compressed.length, size: data.length, offset })
    offset += local.length + name.length + compressed.length
  }
  const centralStart = offset
  for (const item of central) {
    const header = Buffer.alloc(46)
    header.writeUInt32LE(0x02014b50, 0)
    header.writeUInt16LE(20, 4)
    header.writeUInt16LE(20, 6)
    header.writeUInt16LE(0x0800, 8)
    header.writeUInt16LE(8, 10)
    header.writeUInt32LE(item.crc, 16)
    header.writeUInt32LE(item.compressed, 20)
    header.writeUInt32LE(item.size, 24)
    header.writeUInt16LE(item.name.length, 28)
    header.writeUInt32LE(item.offset, 42)
    chunks.push(header, item.name)
    offset += header.length + item.name.length
  }
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50, 0)
  end.writeUInt16LE(central.length, 8)
  end.writeUInt16LE(central.length, 10)
  end.writeUInt32LE(offset - centralStart, 12)
  end.writeUInt32LE(centralStart, 16)
  return Buffer.concat([...chunks, end])
}

function unzip(buffer) {
  const files = new Map()
  let eocd = -1
  for (let i = buffer.length - 22; i >= 0 && i > buffer.length - 66000; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('不是有效的 xlsx（找不到 zip 目录）')
  const count = buffer.readUInt16LE(eocd + 10)
  let pointer = buffer.readUInt32LE(eocd + 16)
  for (let i = 0; i < count; i += 1) {
    if (buffer.readUInt32LE(pointer) !== 0x02014b50) break
    const method = buffer.readUInt16LE(pointer + 10)
    const compressedSize = buffer.readUInt32LE(pointer + 20)
    const nameLength = buffer.readUInt16LE(pointer + 28)
    const extraLength = buffer.readUInt16LE(pointer + 30)
    const commentLength = buffer.readUInt16LE(pointer + 32)
    const localOffset = buffer.readUInt32LE(pointer + 42)
    const name = buffer.toString('utf8', pointer + 46, pointer + 46 + nameLength)
    const localNameLength = buffer.readUInt16LE(localOffset + 26)
    const localExtraLength = buffer.readUInt16LE(localOffset + 28)
    const start = localOffset + 30 + localNameLength + localExtraLength
    const raw = buffer.subarray(start, start + compressedSize)
    files.set(name, method === 8 ? inflateRawSync(raw) : Buffer.from(raw))
    pointer += 46 + nameLength + extraLength + commentLength
  }
  return files
}

/* --------------------------------- xml ----------------------------------- */

const escapeXml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '')

const unescapeXml = (value) => String(value ?? '')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&apos;/g, "'")
  .replace(/&amp;/g, '&')

function columnName(index) {
  let name = ''
  let value = index + 1
  while (value > 0) {
    const rest = (value - 1) % 26
    name = String.fromCharCode(65 + rest) + name
    value = Math.floor((value - 1) / 26)
  }
  return name
}

function columnIndex(ref) {
  const letters = String(ref).match(/^[A-Z]+/i)
  if (!letters) return 0
  let index = 0
  for (const char of letters[0].toUpperCase()) index = index * 26 + (char.charCodeAt(0) - 64)
  return index - 1
}

/* -------------------------------- writer --------------------------------- */

const CONTENT_TYPES = (sheetCount) => `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
<Default Extension="xml" ContentType="application/xml"/>
<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
${Array.from({ length: sheetCount }, (_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('\n')}
</Types>`

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`

const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="2"><font><sz val="11"/><name val="Microsoft YaHei"/></font><font><b/><sz val="11"/><name val="Microsoft YaHei"/></font></fonts>
<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>
<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="0"/></xf><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf></cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`

function cellXml(ref, value, bold) {
  if (value === null || value === undefined || value === '') return ''
  const style = bold ? ' s="1"' : ''
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `<c r="${ref}"${style}><v>${value}</v></c>`
  }
  return `<c r="${ref}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`
}

function sheetXml(rows, widths) {
  const body = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIdx) => cellXml(`${columnName(columnIdx)}${rowIndex + 1}`, value, rowIndex === 0)).join('')
    return `<row r="${rowIndex + 1}">${cells}</row>`
  }).join('')
  const cols = widths && widths.length
    ? `<cols>${widths.map((width, i) => `<col min="${i + 1}" max="${i + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>`
    : ''
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetPr><outlinePr summaryBelow="1" summaryRight="1"/></sheetPr>${cols}<sheetData>${body}</sheetData><autoFilter ref="A1:${columnName(Math.max(0, (rows[0] || []).length - 1))}${Math.max(1, rows.length)}"/></worksheet>`
}

/**
 * Write an xlsx file.
 * @param {{name:string, rows:Array<Array<string|number>>, widths?:number[]}[]} sheets
 * @returns {Buffer}
 */
export function buildXlsx(sheets) {
  const workbook = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${
  sheets.map((sheet, i) => `<sheet name="${escapeXml(sheet.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')
}</sheets></workbook>`

  const workbookRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${
  sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')
}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`

  const entries = [
    { name: '[Content_Types].xml', data: Buffer.from(CONTENT_TYPES(sheets.length), 'utf8') },
    { name: '_rels/.rels', data: Buffer.from(ROOT_RELS, 'utf8') },
    { name: 'xl/workbook.xml', data: Buffer.from(workbook, 'utf8') },
    { name: 'xl/_rels/workbook.xml.rels', data: Buffer.from(workbookRels, 'utf8') },
    { name: 'xl/styles.xml', data: Buffer.from(STYLES, 'utf8') },
    ...sheets.map((sheet, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: Buffer.from(sheetXml(sheet.rows, sheet.widths), 'utf8') })),
  ]
  return zip(entries)
}

/* -------------------------------- reader --------------------------------- */

function textOf(xml) {
  const parts = []
  const pattern = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g
  let match = pattern.exec(xml)
  while (match) {
    parts.push(unescapeXml(match[1]))
    match = pattern.exec(xml)
  }
  return parts.join('')
}

function parseSheet(xml, shared) {
  const rows = []
  const rowPattern = /<row[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g
  let rowMatch = rowPattern.exec(xml)
  while (rowMatch) {
    const index = Number(rowMatch[1]) - 1
    const cells = []
    const cellPattern = /<c([^>]*)>([\s\S]*?)<\/c>/g
    let cellMatch = cellPattern.exec(rowMatch[2])
    while (cellMatch) {
      const attrs = cellMatch[1]
      const inner = cellMatch[2]
      const ref = (attrs.match(/r="([A-Z]+\d+)"/) || [])[1]
      const type = (attrs.match(/t="([^"]+)"/) || [])[1]
      const column = ref ? columnIndex(ref) : cells.length
      let value = ''
      if (type === 's') {
        const pointer = Number((inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1])
        value = shared[pointer] ?? ''
      } else if (type === 'inlineStr') {
        value = textOf(inner)
      } else {
        const raw = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1]
        value = raw === undefined ? '' : unescapeXml(raw)
        if (value !== '' && !Number.isNaN(Number(value))) value = Number(value)
      }
      cells[column] = value
      cellMatch = cellPattern.exec(rowMatch[2])
    }
    rows[index] = cells
    rowMatch = rowPattern.exec(xml)
  }
  return rows.map((row) => row || [])
}

/**
 * Read the first worksheet of an xlsx buffer as a matrix of cell values.
 * @param {Buffer} buffer
 * @returns {Array<Array<string|number>>}
 */
export function readXlsx(buffer) {
  const files = unzip(buffer)
  const sharedXml = files.get('xl/sharedStrings.xml')
  const shared = []
  if (sharedXml) {
    const pattern = /<si>([\s\S]*?)<\/si>/g
    let match = pattern.exec(sharedXml.toString('utf8'))
    while (match) {
      shared.push(textOf(match[1]))
      match = pattern.exec(sharedXml.toString('utf8'))
    }
  }
  const sheet = files.get('xl/worksheets/sheet1.xml')
  if (!sheet) {
    const first = [...files.keys()].find((name) => /^xl\/worksheets\/sheet\d+\.xml$/.test(name))
    if (!first) throw new Error('xlsx 里没有工作表')
    return parseSheet(files.get(first).toString('utf8'), shared)
  }
  return parseSheet(sheet.toString('utf8'), shared)
}

/** Minimal CSV reader (handles quotes and CRLF) used when the user uploads .csv. */
export function readCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let quoted = false
  const source = String(text).replace(/^\uFEFF/, '')
  for (let i = 0; i < source.length; i += 1) {
    const char = source[i]
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { field += '"'; i += 1 } else if (char === '"') quoted = false
      else field += char
    } else if (char === '"') quoted = true
    else if (char === ',') { row.push(field); field = '' }
    else if (char === '\n') { row.push(field); rows.push(row); row = []; field = '' }
    else if (char === '\r') { /* skip */ }
    else field += char
  }
  if (field !== '' || row.length > 0) { row.push(field); rows.push(row) }
  return rows
}
