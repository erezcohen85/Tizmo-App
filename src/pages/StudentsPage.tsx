import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, Upload } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { EnsembleDot } from '@/components/EnsembleDot'
import { EnsembleSelect } from '@/components/EnsembleSelect'
import { useI18n } from '@/i18n'
import { shiftISODate, todayISO } from '@/lib/dates'
import { computeStudentStats } from '@/lib/roster'
import { toastSuccess } from '@/lib/toastUndo'
import { cn } from '@/lib/utils'
import { useEnsembles } from '@/queries/ensembles'
import {
  useCreateStudent,
  useDeleteStudent,
  useMemberships,
  useStudents,
  useUpdateStudent,
  type MembershipInput,
} from '@/queries/students'
import { useSessionsInRange } from '@/queries/sessions'
import { useAttendanceForSessions } from '@/queries/attendance'
import ImportPanel from './ImportPanel'
import type { Tables } from '@/lib/database.types'

export default function StudentsPage() {
  const { t } = useI18n()
  const { data: students } = useStudents()
  const { data: memberships } = useMemberships()
  const { data: ensembles } = useEnsembles()
  const deleteStudent = useDeleteStudent()

  const [search, setSearch] = useState('')
  const [ensembleFilter, setEnsembleFilter] = useState<string | undefined>(undefined)
  const [showTerminated, setShowTerminated] = useState(false)
  const [editing, setEditing] = useState<Tables<'students'> | 'new' | null>(null)
  const [detail, setDetail] = useState<Tables<'students'> | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const today = todayISO()

  const filtered = useMemo(() => {
    if (!students) return []
    return students.filter((s) => {
      const q = search.toLowerCase()
      if (q && !`${s.first_name} ${s.last_name} ${s.instrument ?? ''}`.toLowerCase().includes(q)) return false
      const own = (memberships ?? []).filter((m) => m.student_id === s.id)
      if (ensembleFilter && !own.some((m) => m.ensemble_id === ensembleFilter)) return false
      if (!showTerminated) {
        const hasActive = own.some((m) => !m.terminated_on || m.terminated_on >= today)
        if (own.length > 0 && !hasActive) return false
      }
      return true
    })
  }, [students, memberships, search, ensembleFilter, showTerminated, today])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder={t('manage.search')} value={search} onChange={(e) => setSearch(e.target.value)} className="w-48" />
        <EnsembleSelect ensembles={ensembles ?? []} value={ensembleFilter} onChange={setEnsembleFilter} allowAll />
        <label className="flex items-center gap-1 text-sm">
          <input type="checkbox" checked={showTerminated} onChange={(e) => setShowTerminated(e.target.checked)} />
          {t('manage.showTerminated')}
        </label>
        <div className="ms-auto flex gap-2">
          <Button size="sm" onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            {t('manage.newStudent')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" />
            {t('manage.tabImport')}
          </Button>
        </div>
      </div>

      <ul className="divide-y rounded-lg border">
        {filtered.map((s) => {
          const own = (memberships ?? []).filter((m) => m.student_id === s.id)
          return (
            <li key={s.id} className="flex flex-wrap items-center gap-2 p-3">
              <button type="button" className="min-w-40 flex-1 text-start" onClick={() => setDetail(s)}>
                <p className="font-medium">
                  {s.first_name} {s.last_name}
                </p>
                <p className="text-sm text-muted-foreground">{[s.instrument, s.grade].filter(Boolean).join(' · ')}</p>
              </button>
              <div className="flex flex-wrap gap-1">
                {own.map((m) => {
                  const ensemble = ensembles?.find((e) => e.id === m.ensemble_id)
                  if (!ensemble) return null
                  const terminated = m.terminated_on && m.terminated_on < today
                  return (
                    <span
                      key={m.ensemble_id}
                      className={cn('flex items-center gap-1 rounded px-1.5 py-0.5 text-xs', terminated && 'opacity-50')}
                      style={{ backgroundColor: `${ensemble.color}26`, color: ensemble.color }}
                    >
                      <EnsembleDot color={ensemble.color} className="size-1.5" />
                      {ensemble.name}
                    </span>
                  )
                })}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setEditing(s)}>
                {t('common.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm(t('session.deleteConfirm'))) return
                  try {
                    await deleteStudent.mutateAsync(s.id)
                    toastSuccess(t('toasts.studentDeleted'))
                  } catch {
                    toast.error(t('errors.saveFailed'))
                  }
                }}
              >
                {t('common.delete')}
              </Button>
            </li>
          )
        })}
        {filtered.length === 0 && <li className="p-4 text-sm text-muted-foreground">—</li>}
      </ul>

      <StudentSheet
        key={editing === 'new' ? 'new' : (editing?.id ?? 'closed')}
        student={editing === 'new' ? null : editing}
        open={editing !== null}
        onClose={() => setEditing(null)}
        ensembles={ensembles ?? []}
        existingMemberships={editing && editing !== 'new' ? (memberships ?? []).filter((m) => m.student_id === editing.id) : []}
      />

      {detail && <StudentDetailSheet student={detail} onClose={() => setDetail(null)} />}

      <Sheet open={importOpen} onOpenChange={setImportOpen}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>{t('manage.tabImport')}</SheetTitle>
          </SheetHeader>
          <div className="p-4">
            <ImportPanel onDone={() => setImportOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** Per-student attendance record across their ensembles. */
function StudentDetailSheet({ student, onClose }: { student: Tables<'students'>; onClose: () => void }) {
  const { t } = useI18n()
  const { data: ensembles } = useEnsembles()
  const { data: memberships } = useMemberships()

  const [from, setFrom] = useState(() => shiftISODate(todayISO(), -180))
  const [to, setTo] = useState(() => todayISO())

  const { data: sessions } = useSessionsInRange(from, to)
  const sessionIds = useMemo(() => (sessions ?? []).map((s) => s.id), [sessions])
  const { data: attendanceRows } = useAttendanceForSessions(sessionIds)

  const own = (memberships ?? []).filter((m) => m.student_id === student.id)

  return (
    <Sheet open onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>
            {student.first_name} {student.last_name}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            {[student.instrument, student.grade].filter(Boolean).join(' · ')}
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            <span className="text-sm text-muted-foreground">{t('history.to')}</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
          </div>

          <Table>
            <TableHeader>
              <TableRow className="border-b-0">
                <TableHead>{t('attendance.ensemble')}</TableHead>
                <TableHead>{t('ensemble.sessionsCounted')}</TableHead>
                <TableHead>{t('statuses.present')}</TableHead>
                <TableHead>{t('statuses.absent')}</TableHead>
                <TableHead>{t('statuses.late')}</TableHead>
                <TableHead>{t('ensemble.attendanceRate')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {own.map((m) => {
                const ensemble = ensembles?.find((e) => e.id === m.ensemble_id)
                if (!ensemble) return null
                const stats = computeStudentStats(
                  student.id,
                  memberships ?? [],
                  sessions ?? [],
                  attendanceRows ?? [],
                  m.ensemble_id,
                )
                return (
                  <TableRow key={m.ensemble_id} className="border-b-0">
                    <TableCell>
                      <Link
                        to={`/ensemble/${ensemble.id}`}
                        className="flex items-center gap-2 hover:underline"
                        onClick={onClose}
                      >
                        <EnsembleDot color={ensemble.color} />
                        {ensemble.name}
                      </Link>
                    </TableCell>
                    <TableCell>{stats.counted}</TableCell>
                    <TableCell>{stats.present}</TableCell>
                    <TableCell>{stats.absent}</TableCell>
                    <TableCell>{stats.late}</TableCell>
                    <TableCell
                      className={cn('font-medium', stats.percentage !== null && stats.percentage < 70 && 'text-destructive')}
                    >
                      {stats.percentage === null ? '—' : `${stats.percentage}%`}
                    </TableCell>
                  </TableRow>
                )
              })}
              {own.length === 0 && (
                <TableRow className="border-b-0">
                  <TableCell colSpan={6} className="text-sm text-muted-foreground">
                    —
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="flex flex-wrap gap-1">
            {own.map((m) => {
              const ensemble = ensembles?.find((e) => e.id === m.ensemble_id)
              if (!ensemble) return null
              return (
                <Badge key={m.ensemble_id} variant="outline">
                  {ensemble.name} · {m.joined_on}
                  {m.terminated_on ? ` → ${m.terminated_on}` : ''}
                </Badge>
              )
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

function StudentSheet({
  student,
  open,
  onClose,
  ensembles,
  existingMemberships,
}: {
  student: Tables<'students'> | null
  open: boolean
  onClose: () => void
  ensembles: Tables<'ensembles'>[]
  existingMemberships: Tables<'student_ensembles'>[]
}) {
  const { t } = useI18n()
  const createStudent = useCreateStudent()
  const updateStudent = useUpdateStudent()
  const deleteStudent = useDeleteStudent()

  const [firstName, setFirstName] = useState(student?.first_name ?? '')
  const [lastName, setLastName] = useState(student?.last_name ?? '')
  const [instrument, setInstrument] = useState(student?.instrument ?? '')
  const [grade, setGrade] = useState(student?.grade ?? '')
  const [rows, setRows] = useState<MembershipInput[]>(
    existingMemberships.map((m) => ({ ensemble_id: m.ensemble_id, joined_on: m.joined_on, terminated_on: m.terminated_on })),
  )

  function addRow() {
    setRows((r) => [...r, { ensemble_id: ensembles[0]?.id ?? '', joined_on: todayISO(), terminated_on: null }])
  }

  async function submit() {
    const values = { first_name: firstName, last_name: lastName, instrument: instrument || null, grade: grade || null }
    try {
      if (student) {
        const beforeStudent = student
        const beforeMemberships = existingMemberships.map((m) => ({
          ensemble_id: m.ensemble_id,
          joined_on: m.joined_on,
          terminated_on: m.terminated_on,
        }))
        await updateStudent.mutateAsync({
          id: student.id,
          student: values,
          memberships: rows.filter((r) => r.ensemble_id),
          originalEnsembleIds: existingMemberships.map((m) => m.ensemble_id),
        })
        onClose()
        toastSuccess(t('toasts.studentUpdated'), {
          label: t('common.undo'),
          onUndo: async () => {
            try {
              await updateStudent.mutateAsync({
                id: beforeStudent.id,
                student: {
                  first_name: beforeStudent.first_name,
                  last_name: beforeStudent.last_name,
                  instrument: beforeStudent.instrument,
                  grade: beforeStudent.grade,
                },
                memberships: beforeMemberships,
                originalEnsembleIds: rows.filter((r) => r.ensemble_id).map((r) => r.ensemble_id),
              })
              toast.success(t('common.undone'))
            } catch {
              toast.error(t('errors.saveFailed'))
            }
          },
        })
      } else {
        const created = await createStudent.mutateAsync({ student: values, memberships: rows.filter((r) => r.ensemble_id) })
        onClose()
        toastSuccess(t('toasts.studentCreated'), {
          label: t('common.undo'),
          onUndo: async () => {
            try {
              await deleteStudent.mutateAsync(created.id)
              toast.success(t('common.undone'))
            } catch {
              toast.error(t('errors.saveFailed'))
            }
          },
        })
      }
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{student ? t('common.edit') : t('manage.newStudent')}</SheetTitle>
        </SheetHeader>
        <div className="space-y-3 p-4">
          <Input placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          <Input placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          <Input placeholder="Instrument" value={instrument} onChange={(e) => setInstrument(e.target.value)} />
          <Input placeholder="Grade" value={grade} onChange={(e) => setGrade(e.target.value)} />

          <div className="space-y-2">
            <p className="text-sm font-medium">{t('manage.memberships')}</p>
            {rows.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <Select
                  value={r.ensemble_id}
                  onValueChange={(v) => setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, ensemble_id: v } : x)))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ensembles.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  type="date"
                  value={r.joined_on}
                  onChange={(e) => setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, joined_on: e.target.value } : x)))}
                />
                <Input
                  type="date"
                  value={r.terminated_on ?? ''}
                  onChange={(e) =>
                    setRows((rs) => rs.map((x, idx) => (idx === i ? { ...x, terminated_on: e.target.value || null } : x)))
                  }
                />
                <Button variant="ghost" size="sm" onClick={() => setRows((rs) => rs.filter((_, idx) => idx !== i))}>
                  ×
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRow}>
              {t('manage.addEnsembleMembership')}
            </Button>
          </div>

          <Button onClick={submit}>{t('common.save')}</Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
