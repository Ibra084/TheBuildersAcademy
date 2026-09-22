import ExcelJS from 'exceljs'
import Papa from 'papaparse'
import yauzl from 'yauzl'
import { Fault, MAX_FILE_BYTES, MAX_ROWS, validateStudent } from './identity.js'

async function inspectZip(buffer) {
  await new Promise((resolve, reject) => yauzl.fromBuffer(buffer, { lazyEntries: true }, (err, zip) => {
    if (err) return reject(new Fault(400, 'Invalid XLSX file.'))
    let bytes = 0, count = 0
    zip.on('error', reject); zip.on('end', resolve)
    zip.on('entry', entry => {
      bytes += entry.uncompressedSize
      if (++count > 1000 || bytes > 12 * 1024 * 1024 || /vbaProject|externalLinks/i.test(entry.fileName)) { zip.close(); reject(new Fault(400, 'Workbook is too large or contains macros/external links.')); return }
      zip.readEntry()
    }); zip.readEntry()
  }))
}
export async function parseStudents(filename, buffer) {
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new Fault(400, 'Choose a non-empty CSV or XLSX file up to 2 MB.')
  let rows
  if (/\.csv$/i.test(filename)) {
    let text
    try { text = new TextDecoder('utf-8', { fatal: true }).decode(buffer).replace(/^\uFEFF/, '') } catch { throw new Fault(400, 'Save the CSV using UTF-8 encoding.') }
    const parsed = Papa.parse(text, { skipEmptyLines: false })
    if (parsed.errors.length) throw new Fault(400, 'Malformed CSV: ' + parsed.errors[0].message)
    rows = parsed.data
    if (rows.at(-1)?.length === 1 && rows.at(-1)[0] === '') rows.pop()
  } else if (/\.xlsx$/i.test(filename)) {
    await inspectZip(buffer)
    const workbook = new ExcelJS.Workbook()
    try { await workbook.xlsx.load(buffer) } catch { throw new Fault(400, 'Unable to read this XLSX file.') }
    if (workbook.worksheets.length !== 1) throw new Fault(400, 'Use a workbook with exactly one worksheet.')
    const sheet = workbook.worksheets[0]
    if (sheet.rowCount > MAX_ROWS + 1 || sheet.columnCount > 3) throw new Fault(400, `Use at most ${MAX_ROWS} rows and the three template columns.`)
    rows = []
    sheet.eachRow({ includeEmpty: true }, row => {
      const values = []
      row.eachCell({ includeEmpty: true }, cell => {
        if (cell.value !== null && typeof cell.value !== 'string') throw new Fault(400, `Row ${row.number}: only plain text cells are accepted; formulas, links and numbers are not supported.`)
        values.push(cell.value ?? '')
      }); rows.push(values)
    })
  } else throw new Fault(400, 'Only .csv and .xlsx files are supported.')
  if (rows.length < 2 || rows.length > MAX_ROWS + 1) throw new Fault(400, `Provide between 1 and ${MAX_ROWS} students.`)
  const headers = rows.shift().map(h => String(h).trim().toLowerCase())
  if (new Set(headers).size !== headers.length || !headers.includes('first_name') || !headers.includes('last_name') || headers.some(h => !['first_name', 'last_name', 'display_name'].includes(h))) throw new Fault(400, 'Use first_name, last_name, and optional display_name only. Email and school identifiers must not be uploaded.')
  const seen = new Set()
  return rows.map((values, index) => {
    try {
      if (values.length > headers.length) throw new Fault(400, 'Too many columns.')
      const student = validateStudent(Object.fromEntries(headers.map((key, i) => [key, values[i] ?? ''])))
      const duplicate = `${student.first_name}\0${student.last_name}`.toLocaleLowerCase()
      if (seen.has(duplicate)) throw new Fault(400, 'Duplicate name in spreadsheet. Review before importing.')
      seen.add(duplicate)
      return { row: index + 2, student, error: null }
    } catch (error) { return { row: index + 2, student: null, error: error.message } }
  })
}
