import { describe, expect, it } from 'vitest'
import { computeSessionCounts, computeStudentStats, isActiveOn, type AttendanceRow, type Membership, type SessionLite } from './roster'

describe('isActiveOn', () => {
  const base: Membership = { student_id: 's1', ensemble_id: 'e1', joined_on: '2026-01-01', terminated_on: null }

  it('active when joined_on equals date', () => {
    expect(isActiveOn(base, '2026-01-01')).toBe(true)
  })

  it('inactive before joined_on', () => {
    expect(isActiveOn(base, '2025-12-31')).toBe(false)
  })

  it('active when terminated_on equals date', () => {
    expect(isActiveOn({ ...base, terminated_on: '2026-06-01' }, '2026-06-01')).toBe(true)
  })

  it('inactive after terminated_on', () => {
    expect(isActiveOn({ ...base, terminated_on: '2026-06-01' }, '2026-06-02')).toBe(false)
  })

  it('active indefinitely when terminated_on is null', () => {
    expect(isActiveOn(base, '2099-01-01')).toBe(true)
  })

  it('respects ensembleId filter', () => {
    expect(isActiveOn(base, '2026-01-05', 'other-ensemble')).toBe(false)
  })
})

describe('computeStudentStats', () => {
  const memberships: Membership[] = [
    { student_id: 's1', ensemble_id: 'e1', joined_on: '2026-01-01', terminated_on: '2026-03-01' },
  ]

  const sessions: SessionLite[] = [
    { id: 'sess1', date: '2026-01-15', kind: 'rehearsal', status: 'held', ensemble_ids: ['e1'] },
    { id: 'sess2', date: '2026-04-01', kind: 'rehearsal', status: 'held', ensemble_ids: ['e1'] }, // outside window
    { id: 'sess3', date: '2026-02-01', kind: 'rehearsal', status: 'canceled', ensemble_ids: ['e1'] }, // canceled, excluded
  ]

  const attendance: AttendanceRow[] = [{ session_id: 'sess1', student_id: 's1', status: 'present' }]

  it('excludes canceled sessions and sessions outside the membership window', () => {
    const stats = computeStudentStats('s1', memberships, sessions, attendance)
    expect(stats.counted).toBe(1)
    expect(stats.present).toBe(1)
    expect(stats.percentage).toBe(100)
  })

  it('reports unmarked when no attendance row exists inside the window', () => {
    const stats = computeStudentStats('s1', memberships, sessions, [])
    expect(stats.counted).toBe(1)
    expect(stats.unmarked).toBe(1)
    expect(stats.percentage).toBe(0)
  })

  it('returns null percentage when no sessions are counted', () => {
    const stats = computeStudentStats('nobody', memberships, sessions, attendance)
    expect(stats.counted).toBe(0)
    expect(stats.percentage).toBeNull()
  })
})

describe('computeSessionCounts', () => {
  it('tallies statuses and derives unmarked from roster size', () => {
    const attendance: AttendanceRow[] = [
      { session_id: 's1', student_id: 'a', status: 'present' },
      { session_id: 's1', student_id: 'b', status: 'absent' },
      { session_id: 's1', student_id: 'c', status: 'late' },
    ]
    const counts = computeSessionCounts('s1', attendance, 5)
    expect(counts).toEqual({ present: 1, absent: 1, late: 1, excused: 0, unmarked: 2 })
  })
})
