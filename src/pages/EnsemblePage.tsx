import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpDown, Plus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { DateNav } from '@/components/DateNav'
import { EmptyState } from '@/components/EmptyState'
import { EnsembleSelect } from '@/components/EnsembleSelect'
import { StatusCell } from '@/components/StatusCell'
import { StudentNoteButton } from '@/components/StudentNoteButton'
import { useI18n } from '@/i18n'
import { shiftISODate, todayISO } from '@/lib/dates'
import { activeMembershipsOn, computeSessionCounts, computeStudentStats } from '@/lib/roster'
import { DISPLAY_STATE_CLASS, displayState, type DisplayState } from '@/lib/sessionState'
import { supabase } from '@/lib/supabase'
import { toastSuccess } from '@/lib/toastUndo'
import { cn } from '@/lib/utils'
import { useEnsembles } from '@/queries/ensembles'
import {
  useAddMembership,
  useCreateStudent,
  useDeleteMembershipForever,
  useEndMembership,
  useMemberships,
  useStudents,
} from '@/queries/students'
import {
  useGetOrCreateRehearsal,
  useSessionDatesForEnsemble,
  useSessionsForEnsembleOnDate,
  useSessionsInRange,
  useUpdateSession,
} from '@/queries/sessions'
import { useAttendance, useAttendanceForSessions, useSetAttendanceStatus } from '@/queries/attendance'
import { useQueryClient } from '@tanstack/react-query'
import type { Database, Tables } from '@/lib/database.types'

type CancelReason = Database['public']['Enums']['cancel_reason']
type AttStatus = 'present' | 'absent' | 'late' | 'excused'

export default function EnsemblePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { ensembleId } = useParams<{ ensembleId: string }>()
  const [params, setParams] = useSearchParams()

  const { data: ensembles } = useEnsembles()
  const { data: students } = useStudents()
  const { data: memberships } = useMemberships()

  const ensemble = ensembles?.find((e) => e.id === ensembleId)
  const [date, setDate] = useState(() => params.get('date') ?? todayISO())

  useEffect(() => {
    const next = new URLSearchParams(params)
    next.set('date', date)
    setParams(next, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date])

  const { data: sessionsOnDate } = useSessionsForEnsembleOnDate(ensembleId, date)
  const { data: availableDates } = useSessionDatesForEnsemble(ensembleId)
  const rehearsal = sessionsOnDate?.find((s) => s.kind === 'rehearsal')
  const [selectedSessionId, setSelectedSessionId] = useState<string | undefined>(undefined)

  useEffect(() => {
    setSelectedSessionId(rehearsal?.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ensembleId, date, sessionsOnDate?.length])

  const selectedSession = sessionsOnDate?.find((s) => s.id === selectedSessionId) ?? rehearsal
  const activeSessionId = selectedSession?.id

  const getOrCreateRehearsal = useGetOrCreateRehearsal()
  const updateSession = useUpdateSession()
  const { data: attendance } = useAttendance(activeSessionId)
  const setStatus = useSetAttendanceStatus(activeSessionId ?? '')
  const queryClient = useQueryClient()

  const roster = useMemo(() => {
    if (!ensembleId || !students || !memberships) return []
    const active = activeMembershipsOn(memberships, date, ensembleId)
    const ids = new Set(active.map((m) => m.student_id))
    return students.filter((s) => ids.has(s.id))
  }, [ensembleId, students, memberships, date])

  type SortKey = 'name' | 'instrument' | 'grade'
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  const sortedRoster = useMemo(() => {
    return [...roster].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'name') cmp = `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`)
      else if (sortKey === 'instrument') cmp = (a.instrument ?? '').localeCompare(b.instrument ?? '')
      else cmp = (a.grade ?? '').localeCompare(b.grade ?? '')
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [roster, sortKey, sortDir])

  async function ensureSession(): Promise<string> {
    if (activeSessionId) return activeSessionId
    if (!ensembleId) throw new Error('no ensemble')
    const created = await getOrCreateRehearsal.mutateAsync({ ensembleId, date })
    setSelectedSessionId(created.id)
    return created.id
  }

  async function handleStatus(studentId: string, next: AttStatus | null) {
    try {
      const sid = await ensureSession()
      if (sid === activeSessionId) {
        await setStatus.mutateAsync({ studentId, status: next })
      } else {
        if (next === null) {
          await supabase.from('attendance').delete().eq('session_id', sid).eq('student_id', studentId)
        } else {
          await supabase
            .from('attendance')
            .upsert({ session_id: sid, student_id: studentId, status: next }, { onConflict: 'session_id,student_id' })
        }
        queryClient.invalidateQueries({ queryKey: ['attendance', sid] })
      }
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  async function handleNote(studentId: string, note: string) {
    try {
      const sid = await ensureSession()
      const { error } = await supabase.from('attendance').update({ note }).eq('session_id', sid).eq('student_id', studentId)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['attendance', sid] })
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  async function handleMarkAllPresent() {
    try {
      const sid = await ensureSession()
      const { data: existing } = await supabase.from('attendance').select('student_id').eq('session_id', sid)
      const already = new Set((existing ?? []).map((a) => a.student_id))
      const toInsert = roster.filter((r) => !already.has(r.id))
      if (toInsert.length) {
        const { error } = await supabase
          .from('attendance')
          .insert(toInsert.map((r) => ({ session_id: sid, student_id: r.id, status: 'present' as const })))
        if (error) throw error
      }
      queryClient.invalidateQueries({ queryKey: ['attendance', sid] })
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  // ---- session state dropdown ----
  const [cancelOpen, setCancelOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState<CancelReason>('holiday')
  const [cancelNote, setCancelNote] = useState('')

  const state: DisplayState = selectedSession
    ? displayState(selectedSession.status, selectedSession.date)
    : displayState('scheduled', date)

  async function handleStateChange(next: DisplayState) {
    if (next === 'canceled') {
      setCancelOpen(true)
      return
    }
    try {
      const sid = await ensureSession()
      const values =
        next === 'held'
          ? { status: 'held' as const, cancel_reason: null, cancel_note: null }
          : { status: 'scheduled' as const, cancel_reason: null, cancel_note: null }
      await updateSession.mutateAsync({ id: sid, values })
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  async function confirmCancel() {
    try {
      const sid = await ensureSession()
      await updateSession.mutateAsync({
        id: sid,
        values: { status: 'canceled', cancel_reason: cancelReason, cancel_note: cancelNote || null },
      })
      setCancelOpen(false)
      setCancelNote('')
      toastSuccess(t('toasts.sessionCanceled'))
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  const [noteDraft, setNoteDraft] = useState('')
  useEffect(() => setNoteDraft(selectedSession?.rehearsal_note ?? ''), [selectedSession?.id])

  async function handleSessionNote(next: string) {
    setNoteDraft(next)
    try {
      const sid = await ensureSession()
      await updateSession.mutateAsync({ id: sid, values: { rehearsal_note: next } })
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  const counts = activeSessionId ? computeSessionCounts(activeSessionId, attendance ?? [], roster.length) : null
  const isCanceled = state === 'canceled'

  const [addOpen, setAddOpen] = useState(false)
  const [removing, setRemoving] = useState<Tables<'students'> | null>(null)

  if (!ensembles) return null
  if (!ensemble) return <EmptyState title={t('home.noEnsembles')} hint={t('home.noEnsemblesHint')} />

  const isRegularDay = ensemble.weekdays.includes(new Date(date).getDay())

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
          <ArrowLeft className="size-4 rtl:hidden" />
          <ArrowRight className="hidden size-4 rtl:block" />
          {t('ensemble.back')}
        </Button>
        <EnsembleSelect
          ensembles={ensembles}
          value={ensembleId}
          onChange={(id) => id && navigate(`/ensemble/${id}`)}
        />
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">{t('ensemble.tabAttendance')}</TabsTrigger>
          <TabsTrigger value="overview">{t('ensemble.tabOverview')}</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <DateNav date={date} onChange={setDate} availableDates={availableDates} />
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 font-ui text-[12.5px] font-light text-dim transition-colors hover:text-lamp"
            >
              <Plus className="size-3.5" strokeWidth={1.4} />
              {t('ensemble.addStudent')}
            </button>
          </div>

          {!isRegularDay && <p className="text-sm text-muted-foreground">{t('attendance.notRegularDay')}</p>}

          {sessionsOnDate && sessionsOnDate.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {sessionsOnDate.map((s) => {
                const selected = (selectedSessionId ?? rehearsal?.id) === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSessionId(s.id)}
                    className={cn('rounded-full border px-3 py-1 text-sm', selected && 'text-white')}
                    style={selected ? { backgroundColor: ensemble.color, borderColor: ensemble.color } : undefined}
                  >
                    {s.title || t(`kinds.${s.kind}` as never)}
                  </button>
                )
              })}
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={state} onValueChange={(v) => handleStateChange(v as DisplayState)}>
                <SelectTrigger
                  className={cn(
                    'h-auto w-auto gap-1.5 border-0 bg-transparent p-0 font-alt text-[11.5px] tracking-[.14em] shadow-none focus:ring-0',
                    DISPLAY_STATE_CLASS[state],
                  )}
                >
                  <SelectValue>{t(`sessionStatuses.${state}` as never).toUpperCase()}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={date > todayISO() ? 'future' : 'needs_entry'}>
                    {t(`sessionStatuses.${date > todayISO() ? 'future' : 'needs_entry'}` as never)}
                  </SelectItem>
                  <SelectItem value="held">{t('sessionStatuses.held')}</SelectItem>
                  <SelectItem value="canceled">{t('sessionStatuses.canceled')}</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[12.5px] text-faint">
                {(selectedSession?.start_time ?? ensemble.start_time).slice(0, 5)}
              </span>
              {isCanceled && selectedSession?.cancel_reason && (
                <span className="text-[12.5px] text-faint">
                  {t(`cancelReasons.${selectedSession.cancel_reason}` as never)}
                  {selectedSession.cancel_note ? ` — ${selectedSession.cancel_note}` : ''}
                </span>
              )}
            </div>

            {counts && (
              <div className="space-y-1.5">
                <div className="flex items-baseline gap-2 font-ui" style={{ fontWeight: 200 }}>
                  <span className="text-[44px] leading-none tracking-[-.035em] tabular-nums">
                    {counts.present + counts.absent + counts.late + counts.excused}
                  </span>
                  <span className="text-sm text-faint">of {roster.length}</span>
                </div>
                <div className="h-px w-full bg-hairline">
                  <div
                    className="h-px transition-[width] duration-500 ease-out"
                    style={{
                      width: roster.length ? `${((counts.present + counts.absent + counts.late + counts.excused) / roster.length) * 100}%` : '0%',
                      backgroundColor: ensemble.color,
                    }}
                  />
                </div>
              </div>
            )}

            <Textarea
              value={noteDraft}
              onChange={(e) => handleSessionNote(e.target.value)}
              placeholder={t('attendance.rehearsalNotePlaceholder')}
              rows={2}
              className="border-0 border-hairline bg-transparent px-0 shadow-none focus-visible:ring-0"
            />

            <button
              type="button"
              disabled={isCanceled}
              onClick={handleMarkAllPresent}
              className="font-ui text-[12.5px] font-light text-dim transition-colors hover:text-lamp disabled:opacity-50"
            >
              {t('attendance.markAllPresent')}
            </button>
          </div>

          {sortedRoster.length === 0 ? (
            <EmptyState
              title={t('ensemble.noStudents')}
              action={<Button onClick={() => setAddOpen(true)}>{t('ensemble.addStudent')}</Button>}
            />
          ) : (
            <div className={cn('space-y-0', isCanceled && 'opacity-50')}>
              <div className="flex items-center gap-4 pb-2 font-alt text-[10.5px] tracking-[.14em] text-faint">
                <SortableHead label={t('attendance.nameColumn')} active={sortKey === 'name'} dir={sortDir} onClick={() => toggleSort('name')} />
                <SortableHead label={t('attendance.instrumentColumn')} active={sortKey === 'instrument'} dir={sortDir} onClick={() => toggleSort('instrument')} />
                <SortableHead label={t('attendance.gradeColumn')} active={sortKey === 'grade'} dir={sortDir} onClick={() => toggleSort('grade')} />
              </div>
              <ul>
                {sortedRoster.map((student) => {
                  const record = attendance?.find((a) => a.student_id === student.id)
                  const current = (record?.status as AttStatus | undefined) ?? null
                  return (
                    <li
                      key={student.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3.5 shadow-separator"
                    >
                      <div className="min-w-0 flex-1 pe-2">
                        <p className="text-[15.5px] tracking-[-.005em] text-score">
                          {student.first_name} {student.last_name}
                        </p>
                        {(student.instrument || student.grade) && (
                          <p className="mt-[3px] text-[11.5px] text-faint">
                            {[student.instrument, student.grade].filter(Boolean).join(' · ')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center">
                        {(['present', 'absent', 'late', 'excused'] as const).map((s) => (
                          <StatusCell
                            key={s}
                            status={s}
                            current={current}
                            disabled={isCanceled}
                            label={t(`statuses.${s}` as never)}
                            onChange={(v) => handleStatus(student.id, v)}
                          />
                        ))}
                        <StudentNoteButton
                          note={record?.note ?? null}
                          disabled={isCanceled || !record}
                          onSave={(note) => handleNote(student.id, note)}
                        />
                        <button
                          type="button"
                          aria-label={t('ensemble.removeStudent')}
                          onClick={() => setRemoving(student)}
                          className="inline-flex size-11 items-center justify-center text-faint transition-colors hover:text-status-absent"
                        >
                          <X className="size-4" strokeWidth={1.4} />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}
        </TabsContent>

        <TabsContent value="overview">
          <OverviewTab ensembleId={ensemble.id} />
        </TabsContent>
      </Tabs>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('session.cancelConfirm')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={cancelReason} onValueChange={(v) => setCancelReason(v as CancelReason)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="holiday">{t('cancelReasons.holiday')}</SelectItem>
                <SelectItem value="sickness">{t('cancelReasons.sickness')}</SelectItem>
                <SelectItem value="other">{t('cancelReasons.other')}</SelectItem>
              </SelectContent>
            </Select>
            <Textarea value={cancelNote} onChange={(e) => setCancelNote(e.target.value)} placeholder={t('session.cancelNote')} />
          </div>
          <DialogFooter>
            <Button onClick={confirmCancel}>{t('common.save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {addOpen && (
        <AddStudentDialog open={addOpen} onOpenChange={setAddOpen} ensembleId={ensemble.id} joinedOn={date} />
      )}

      {removing && (
        <RemoveStudentDialog
          student={removing}
          ensembleId={ensemble.id}
          onClose={() => setRemoving(null)}
        />
      )}
    </div>
  )
}

function SortableHead({
  label,
  active,
  dir,
  onClick,
}: {
  label: string
  active: boolean
  dir: 'asc' | 'desc'
  onClick: () => void
}) {
  const Icon = active ? (dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('inline-flex items-center gap-1 hover:text-score', active && 'text-score')}
    >
      {label}
      <Icon className="size-3" />
    </button>
  )
}

function OverviewTab({ ensembleId }: { ensembleId: string }) {
  const { t } = useI18n()
  const { data: students } = useStudents()
  const { data: memberships } = useMemberships()

  const [from, setFrom] = useState(() => shiftISODate(todayISO(), -90))
  const [to, setTo] = useState(() => todayISO())

  const { data: sessions } = useSessionsInRange(from, to, ensembleId)
  const sessionIds = useMemo(() => (sessions ?? []).map((s) => s.id), [sessions])
  const { data: attendanceRows } = useAttendanceForSessions(sessionIds)

  const rows = useMemo(() => {
    const relevant = (memberships ?? []).filter(
      (m) => m.ensemble_id === ensembleId && m.joined_on <= to && (!m.terminated_on || m.terminated_on >= from),
    )
    return relevant
      .map((m) => {
        const student = students?.find((s) => s.id === m.student_id)
        if (!student) return null
        const stats = computeStudentStats(
          m.student_id,
          memberships ?? [],
          sessions ?? [],
          attendanceRows ?? [],
          ensembleId,
        )
        return { student, stats }
      })
      .filter((r): r is NonNullable<typeof r> => !!r)
      .sort((a, b) => (a.stats.percentage ?? 101) - (b.stats.percentage ?? 101))
  }, [students, memberships, sessions, attendanceRows, ensembleId, from, to])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <span className="text-sm text-muted-foreground">{t('history.to')}</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="border-b-0">
              <TableHead>{t('attendance.nameColumn')}</TableHead>
              <TableHead>{t('attendance.instrumentColumn')}</TableHead>
              <TableHead>{t('ensemble.sessionsCounted')}</TableHead>
              <TableHead>{t('statuses.present')}</TableHead>
              <TableHead>{t('statuses.absent')}</TableHead>
              <TableHead>{t('statuses.late')}</TableHead>
              <TableHead>{t('ensemble.attendanceRate')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ student, stats }) => (
              <TableRow key={student.id} className="border-b-0">
                <TableCell className="font-medium">
                  {student.first_name} {student.last_name}
                </TableCell>
                <TableCell className="text-muted-foreground">{student.instrument}</TableCell>
                <TableCell>{stats.counted}</TableCell>
                <TableCell>{stats.present}</TableCell>
                <TableCell>{stats.absent}</TableCell>
                <TableCell>{stats.late}</TableCell>
                <TableCell
                  className={cn(
                    'font-medium',
                    stats.percentage !== null && stats.percentage < 70 && 'text-destructive',
                  )}
                >
                  {stats.percentage === null ? '—' : `${stats.percentage}%`}
                </TableCell>
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow className="border-b-0">
                <TableCell colSpan={7} className="text-sm text-muted-foreground">
                  —
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function AddStudentDialog({
  open,
  onOpenChange,
  ensembleId,
  joinedOn,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ensembleId: string
  joinedOn: string
}) {
  const { t } = useI18n()
  const { data: students } = useStudents()
  const { data: memberships } = useMemberships()
  const addMembership = useAddMembership()
  const createStudent = useCreateStudent()

  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [instrument, setInstrument] = useState('')
  const [grade, setGrade] = useState('')

  const memberIds = new Set(
    (memberships ?? []).filter((m) => m.ensemble_id === ensembleId && !m.terminated_on).map((m) => m.student_id),
  )

  const matches = (students ?? [])
    .filter((s) => {
      const q = search.trim().toLowerCase()
      if (!q) return false
      return `${s.first_name} ${s.last_name} ${s.instrument ?? ''}`.toLowerCase().includes(q)
    })
    .slice(0, 20)

  async function addExisting(studentId: string) {
    try {
      await addMembership.mutateAsync({ studentId, ensembleId, joinedOn })
      toastSuccess(t('toasts.studentUpdated'))
      onOpenChange(false)
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  async function createAndAdd() {
    if (!firstName.trim() || !lastName.trim()) return
    try {
      await createStudent.mutateAsync({
        student: {
          first_name: firstName,
          last_name: lastName,
          instrument: instrument || null,
          grade: grade || null,
        },
        memberships: [{ ensemble_id: ensembleId, joined_on: joinedOn, terminated_on: null }],
      })
      toastSuccess(t('toasts.studentCreated'))
      onOpenChange(false)
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('ensemble.addStudent')}</DialogTitle>
        </DialogHeader>

        {!creating ? (
          <div className="space-y-3">
            <Input
              placeholder={t('ensemble.searchStudents')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
            <ul className="max-h-64 divide-y overflow-auto rounded border">
              {matches.map((s) => {
                const already = memberIds.has(s.id)
                return (
                  <li key={s.id} className="flex items-center gap-2 p-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.first_name} {s.last_name}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {[s.instrument, s.grade].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <Button size="sm" variant="outline" disabled={already} onClick={() => addExisting(s.id)}>
                      {already ? t('ensemble.alreadyMember') : t('ensemble.addStudent')}
                    </Button>
                  </li>
                )
              })}
              {search.trim() && matches.length === 0 && (
                <li className="p-2 text-sm text-muted-foreground">—</li>
              )}
            </ul>
            <Button variant="outline" onClick={() => setCreating(true)}>
              <Plus className="size-4" />
              {t('ensemble.createNew')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
            <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            <Input placeholder="Instrument" value={instrument} onChange={(e) => setInstrument(e.target.value)} />
            <Input placeholder="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} />
            <DialogFooter>
              <Button variant="ghost" onClick={() => setCreating(false)}>
                {t('common.cancel')}
              </Button>
              <Button onClick={createAndAdd} disabled={!firstName.trim() || !lastName.trim()}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

function RemoveStudentDialog({
  student,
  ensembleId,
  onClose,
}: {
  student: Tables<'students'>
  ensembleId: string
  onClose: () => void
}) {
  const { t } = useI18n()
  const endMembership = useEndMembership()
  const deleteForever = useDeleteMembershipForever()

  async function keepHistory() {
    try {
      await endMembership.mutateAsync({ studentId: student.id, ensembleId, on: todayISO() })
      toastSuccess(t('toasts.studentUpdated'))
      onClose()
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  async function forever() {
    try {
      await deleteForever.mutateAsync({ studentId: student.id, ensembleId })
      toastSuccess(t('toasts.studentDeleted'))
      onClose()
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('ensemble.removeTitle')} — {student.first_name} {student.last_name}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <button
            type="button"
            onClick={keepHistory}
            className="w-full rounded-lg border p-3 text-start hover:bg-accent"
          >
            <p className="font-medium">{t('ensemble.removeKeep')}</p>
            <p className="text-sm text-muted-foreground">{t('ensemble.removeKeepHint')}</p>
          </button>
          <button
            type="button"
            onClick={forever}
            className="w-full rounded-lg border border-destructive/40 p-3 text-start hover:bg-destructive/10"
          >
            <p className="font-medium text-destructive">{t('ensemble.removeForever')}</p>
            <p className="text-sm text-muted-foreground">{t('ensemble.removeForeverHint')}</p>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
