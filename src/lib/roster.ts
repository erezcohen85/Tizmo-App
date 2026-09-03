export type Membership = {
  student_id: string
  ensemble_id: string
  joined_on: string
  terminated_on: string | null
}

export type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused'

export type SessionLite = {
  id: string
  date: string
  kind: string
  status: 'scheduled' | 'held' | 'canceled'
  ensemble_ids: string[]
}

export type AttendanceRow = {
  session_id: string
  student_id: string
  status: AttendanceStatus
}

export type StudentLite = {
  id: string
  first_name: string
  last_name: string
  instrument: string | null
  grade: string | null
}

/** Active membership on date D for ensemble E: joined_on <= D and (terminated_on null or >= D). ISO date string comparison is safe. */
export function isActiveOn(m: Membership, date: string, ensembleId?: string): boolean {
  if (ensembleId && m.ensemble_id !== ensembleId) return false
  if (m.joined_on > date) return false
  if (m.terminated_on && m.terminated_on < date) return false
  return true
}

export function activeMembershipsOn(
  memberships: Membership[],
  date: string,
  ensembleId?: string,
): Membership[] {
  return memberships.filter((m) => isActiveOn(m, date, ensembleId))
}

export type StudentStats = {
  studentId: string
  counted: number
  present: number
  absent: number
  late: number
  excused: number
  unmarked: number
  percentage: number | null
}

/**
 * Attendance stats for one student across a set of sessions + attendance rows,
 * restricted to sessions inside the student's membership window(s) in the given ensemble filter
 * (or any of their ensembles if ensembleId is omitted), and only 'held' sessions.
 */
export function computeStudentStats(
  studentId: string,
  memberships: Membership[],
  sessions: SessionLite[],
  attendance: AttendanceRow[],
  ensembleId?: string,
): StudentStats {
  const studentMemberships = memberships.filter(
    (m) => m.student_id === studentId && (!ensembleId || m.ensemble_id === ensembleId),
  )

  const attendanceByKey = new Map<string, AttendanceStatus>()
  for (const a of attendance) {
    if (a.student_id === studentId) attendanceByKey.set(a.session_id, a.status)
  }

  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  let counted = 0

  for (const s of sessions) {
    if (s.status !== 'held') continue
    const linkedEnsembles = ensembleId ? [ensembleId] : s.ensemble_ids
    const inWindow = studentMemberships.some(
      (m) => linkedEnsembles.includes(m.ensemble_id) && isActiveOn(m, s.date),
    )
    if (!inWindow) continue

    counted += 1
    const status = attendanceByKey.get(s.id)
    if (status === 'present') present += 1
    else if (status === 'absent') absent += 1
    else if (status === 'late') late += 1
    else if (status === 'excused') excused += 1
  }

  const unmarked = counted - present - absent - late - excused
  const percentage = counted > 0 ? Math.round(((present + late) / counted) * 1000) / 10 : null

  return { studentId, counted, present, absent, late, excused, unmarked, percentage }
}

export function computeSessionCounts(sessionId: string, attendance: AttendanceRow[], rosterSize: number) {
  let present = 0
  let absent = 0
  let late = 0
  let excused = 0
  for (const a of attendance) {
    if (a.session_id !== sessionId) continue
    if (a.status === 'present') present += 1
    else if (a.status === 'absent') absent += 1
    else if (a.status === 'late') late += 1
    else if (a.status === 'excused') excused += 1
  }
  const unmarked = rosterSize - present - absent - late - excused
  return { present, absent, late, excused, unmarked }
}
