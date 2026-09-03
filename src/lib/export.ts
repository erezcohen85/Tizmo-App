import * as XLSX from 'xlsx'

export type ExportRow = Record<string, string | number | null>

export function buildSessionRows(rows: ExportRow[]): ExportRow[] {
  return rows
}

export function buildStudentRows(rows: ExportRow[]): ExportRow[] {
  return rows
}

export function buildGridRows(headerDates: string[], rows: { label: string; cells: string[] }[]): ExportRow[] {
  return rows.map((r) => {
    const obj: ExportRow = { student: r.label }
    headerDates.forEach((d, i) => {
      obj[d] = r.cells[i] ?? ''
    })
    return obj
  })
}

function download(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function exportRows(rows: ExportRow[], filename: string, format: 'csv' | 'xlsx') {
  const sheet = XLSX.utils.json_to_sheet(rows)
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(sheet)
    download(filename, new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' }))
    return
  }
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, sheet, 'History')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  download(filename, new Blob([buf], { type: 'application/octet-stream' }))
}
