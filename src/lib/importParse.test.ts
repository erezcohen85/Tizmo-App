import { describe, expect, it } from 'vitest'
import { autoMapColumns, chunk, mapRows } from './importParse'

describe('autoMapColumns', () => {
  it('maps English headers by alias', () => {
    const map = autoMapColumns(['First Name', 'Last Name', 'Instrument', 'Grade'])
    expect(map).toEqual({ first_name: 0, last_name: 1, instrument: 2, grade: 3 })
  })

  it('maps Hebrew headers by alias', () => {
    const map = autoMapColumns(['שם פרטי', 'שם משפחה', 'כלי', 'כיתה'])
    expect(map).toEqual({ first_name: 0, last_name: 1, instrument: 2, grade: 3 })
  })

  it('is case-insensitive and leaves unmatched columns out', () => {
    const map = autoMapColumns(['FIRST', 'Some Other Column'])
    expect(map).toEqual({ first_name: 0 })
  })
})

describe('mapRows', () => {
  it('splits a full name into first/last when requested', () => {
    const rows = mapRows([['Jane Doe', 'violin', '5']], { first_name: 0, instrument: 1, grade: 2 }, true)
    expect(rows[0]).toMatchObject({ first_name: 'Jane', last_name: 'Doe', valid: true })
  })

  it('does not split when a last name column is already mapped', () => {
    const rows = mapRows([['Jane Doe', 'Smith']], { first_name: 0, last_name: 1 }, true)
    expect(rows[0]).toMatchObject({ first_name: 'Jane Doe', last_name: 'Smith' })
  })

  it('flags rows missing first or last name as invalid', () => {
    const rows = mapRows([['', 'Doe'], ['Jane', '']], { first_name: 0, last_name: 1 })
    expect(rows[0].valid).toBe(false)
    expect(rows[1].valid).toBe(false)
  })
})

describe('chunk', () => {
  it('splits an array into chunks of the given size', () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})
