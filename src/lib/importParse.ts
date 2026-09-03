import * as XLSX from 'xlsx'

export type ParsedSheet = {
  headers: string[]
  rows: string[][]
}

export type ParsedWorkbook = {
  sheetNames: string[]
  workbook: XLSX.WorkBook
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const buf = await file.arrayBuffer()
  const workbook = XLSX.read(buf, { type: 'array' })
  return { sheetNames: workbook.SheetNames, workbook }
}

export function extractSheet(workbook: XLSX.WorkBook, sheetName: string): ParsedSheet {
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' })
  const [headers, ...body] = rows
  return { headers: (headers ?? []).map((h) => String(h ?? '').trim()), rows: body }
}

export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  const { workbook, sheetNames } = await parseWorkbook(file)
  return extractSheet(workbook, sheetNames[0])
}

export type ColumnKey = 'first_name' | 'last_name' | 'instrument' | 'grade'

const ALIASES: Record<ColumnKey, string[]> = {
  first_name: ['first', 'first name', 'firstname', 'שם פרטי', 'שם'],
  last_name: ['last', 'last name', 'lastname', 'surname', 'שם משפחה', 'משפחה'],
  instrument: ['instrument', 'כלי'],
  grade: ['grade', 'class', 'כיתה'],
}

export function autoMapColumns(headers: string[]): Partial<Record<ColumnKey, number>> {
  const map: Partial<Record<ColumnKey, number>> = {}
  const lower = headers.map((h) => h.toLowerCase())
  for (const key of Object.keys(ALIASES) as ColumnKey[]) {
    const idx = lower.findIndex((h) => ALIASES[key].includes(h))
    if (idx >= 0) map[key] = idx
  }
  return map
}

export type MappedRow = {
  first_name: string
  last_name: string
  instrument: string
  grade: string
  valid: boolean
}

export function mapRows(
  rows: string[][],
  mapping: Partial<Record<ColumnKey, number>>,
  splitFullName = false,
): MappedRow[] {
  return rows.map((row) => {
    let first_name = mapping.first_name !== undefined ? (row[mapping.first_name] ?? '').trim() : ''
    let last_name = mapping.last_name !== undefined ? (row[mapping.last_name] ?? '').trim() : ''

    if (splitFullName && mapping.first_name !== undefined && mapping.last_name === undefined) {
      const full = first_name
      const spaceIdx = full.indexOf(' ')
      if (spaceIdx >= 0) {
        first_name = full.slice(0, spaceIdx).trim()
        last_name = full.slice(spaceIdx + 1).trim()
      }
    }

    const instrument = mapping.instrument !== undefined ? (row[mapping.instrument] ?? '').trim() : ''
    const grade = mapping.grade !== undefined ? (row[mapping.grade] ?? '').trim() : ''

    return {
      first_name,
      last_name,
      instrument,
      grade,
      valid: first_name.length > 0 && last_name.length > 0,
    }
  })
}

export function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}
