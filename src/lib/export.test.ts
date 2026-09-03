import { describe, expect, it } from 'vitest'
import { buildGridRows } from './export'

describe('buildGridRows', () => {
  it('produces one object per row with a student column plus one column per date', () => {
    const rows = buildGridRows(['2026-01-01', '2026-01-08'], [{ label: 'Jane Doe', cells: ['P', 'A'] }])
    expect(rows).toEqual([{ student: 'Jane Doe', '2026-01-01': 'P', '2026-01-08': 'A' }])
  })

  it('defaults missing cells to an empty string', () => {
    const rows = buildGridRows(['2026-01-01', '2026-01-08'], [{ label: 'Jane Doe', cells: ['P'] }])
    expect(rows[0]['2026-01-08']).toBe('')
  })
})
