import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { EnsembleSelect } from '@/components/EnsembleSelect'
import { useI18n } from '@/i18n'
import { shiftISODate, todayISO, toISODate } from '@/lib/dates'
import { exportRows } from '@/lib/export'
import { computeSessionCounts } from '@/lib/roster'
import { DISPLAY_STATE_CLASS, DISPLAY_STATES, displayState, type DisplayState } from '@/lib/sessionState'
import { toastSuccess } from '@/lib/toastUndo'
import { cn } from '@/lib/utils'
import { useEnsembles } from '@/queries/ensembles'
import {
  useCreateSession,
  useDeleteSession,
  useSessionsInRange,
  useSetSessionEnsembles,
  useUpdateSession,
} from '@/queries/sessions'
import { useAttendanceForSessions } from '@/queries/attendance'
import { useMemberships } from '@/queries/students'
import type { Database } from '@/lib/database.types'

type SessionKind = Database['public']['Enums']['session_kind']

export default function SessionsPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { data: ensembles } = useEnsembles()
  const { data: memberships } = useMemberships()

  const [ensembleId, setEnsembleId] = useState<string | undefined>(undefined)
  const [kind, setKind] = useState<string | undefined>(undefined)
  const [state, setState] = useState<DisplayState | undefined>(undefined)
  const [from, setFrom] = useState(() => shiftISODate(todayISO(), -60))
  const [to, setTo] = useState(() => shiftISODate(todayISO(), 60))

  const { data: sessions } = useSessionsInRange(from, to, ensembleId)

  const filtered = useMemo(() => {
    const today = todayISO()
    return (sessions ?? [])
      .filter((s) => !kind || s.kind === kind)
      .filter((s) => !state || displayState(s.status, s.date, today) === state)
  }, [sessions, kind, state])

  const sessionIds = useMemo(() => filtered.map((s) => s.id), [filtered])
  const { data: attendanceRows } = useAttendanceForSessions(sessionIds)

  const [openSession, setOpenSession] = useState<(typeof filtered)[number] | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  function rosterSizeFor(s: (typeof filtered)[number]) {
    return new Set(
      (memberships ?? [])
        .filter(
          (m) =>
            s.ensemble_ids.includes(m.ensemble_id) &&
            m.joined_on <= s.date &&
            (!m.terminated_on || m.terminated_on >= s.date),
        )
        .map((m) => m.student_id),
    ).size
  }

  function handleExport(format: 'csv' | 'xlsx') {
    const today = todayISO()
    const rows = filtered.map((s) => {
      const size = rosterSizeFor(s)
      const counts = computeSessionCounts(s.id, attendanceRows ?? [], size)
      const st = displayState(s.status, s.date, today)
      const pct = st === 'held' && size > 0 ? Math.round(((counts.present + counts.late) / size) * 1000) / 10 : null
      return {
        date: s.date,
        kind: t(`kinds.${s.kind}` as never),
        title: s.title ?? '',
        ensembles: s.ensemble_ids.map((id) => ensembles?.find((e) => e.id === id)?.name).filter(Boolean).join(', '),
        status: t(`sessionStatuses.${st}` as never),
        present: counts.present,
        absent: counts.absent,
        late: counts.late,
        excused: counts.excused,
        unmarked: counts.unmarked,
        percentage: pct === null ? '—' : `${pct}%`,
      }
    })
    const scope = ensembles?.find((e) => e.id === ensembleId)?.name ?? 'all'
    exportRows(rows, `sessions-${scope}-${from}-${to}.${format}`, format)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <EnsembleSelect ensembles={ensembles ?? []} value={ensembleId} onChange={setEnsembleId} allowAll />

        <Select value={kind ?? '__all__'} onValueChange={(v) => setKind(v === '__all__' ? undefined : v)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('sessions.allTypes')}</SelectItem>
            {(['rehearsal', 'special_rehearsal', 'field_trip', 'exam', 'concert', 'other'] as const).map((k) => (
              <SelectItem key={k} value={k}>
                {t(`kinds.${k}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={state ?? '__all__'} onValueChange={(v) => setState(v === '__all__' ? undefined : (v as DisplayState))}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('manage.allStatuses')}</SelectItem>
            {DISPLAY_STATES.map((s) => (
              <SelectItem key={s} value={s}>
                {t(`sessionStatuses.${s}` as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-1">
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
          <span className="text-sm text-muted-foreground">{t('history.to')}</span>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        </div>

        <div className="ms-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            {t('history.exportCsv')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
            {t('history.exportExcel')}
          </Button>
          <CreateSessionDialog open={createOpen} onOpenChange={setCreateOpen} ensembles={ensembles ?? []} />
        </div>
      </div>

      <ul className="divide-y rounded-lg border">
        {filtered.map((s) => {
          const sessionEnsembles = s.ensemble_ids
            .map((id) => ensembles?.find((e) => e.id === id))
            .filter((e): e is NonNullable<typeof e> => !!e)
          const size = rosterSizeFor(s)
          const counts = computeSessionCounts(s.id, attendanceRows ?? [], size)
          const st = displayState(s.status, s.date)
          return (
            <li
              key={s.id}
              className="flex cursor-pointer flex-wrap items-center gap-2 p-3 hover:bg-accent"
              onClick={() => setOpenSession(s)}
            >
              <span className="w-24 text-sm text-muted-foreground">{s.date}</span>
              <span className={cn('rounded px-1.5 py-0.5 text-xs', DISPLAY_STATE_CLASS[st])}>
                {t(`sessionStatuses.${st}` as never)}
              </span>
              <span className="rounded bg-secondary px-1.5 py-0.5 text-xs">{t(`kinds.${s.kind}` as never)}</span>
              {s.title && <span className="text-sm">{s.title}</span>}
              <span className="flex flex-wrap gap-1">
                {sessionEnsembles.map((e) => (
                  <span
                    key={e.id}
                    className="rounded px-1.5 py-0.5 text-xs"
                    style={{ backgroundColor: `${e.color}26`, color: e.color }}
                  >
                    {e.name}
                  </span>
                ))}
              </span>
              {st === 'held' && (
                <span className="ms-auto text-xs text-muted-foreground">
                  {counts.present}/{size}
                </span>
              )}
            </li>
          )
        })}
        {filtered.length === 0 && <li className="p-4 text-sm text-muted-foreground">—</li>}
      </ul>

      <SessionDetailSheet
        session={openSession}
        ensembles={ensembles ?? []}
        onClose={() => setOpenSession(null)}
        onOpenAttendance={(eid, date) => navigate(`/ensemble/${eid}?date=${date}`)}
      />
    </div>
  )
}

function CreateSessionDialog({
  open,
  onOpenChange,
  ensembles,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ensembles: { id: string; name: string }[]
}) {
  const { t } = useI18n()
  const createSession = useCreateSession()
  const deleteSession = useDeleteSession()
  const [kind, setKind] = useState<Exclude<SessionKind, 'rehearsal'>>('special_rehearsal')
  const [date, setDate] = useState(() => toISODate(new Date()))
  const [title, setTitle] = useState('')
  const [startTime, setStartTime] = useState('')
  const [selectedEnsembles, setSelectedEnsembles] = useState<string[]>([])

  async function submit() {
    if (!selectedEnsembles.length) return
    try {
      const created = await createSession.mutateAsync({
        date,
        kind,
        title: title || null,
        start_time: startTime || null,
        ensemble_ids: selectedEnsembles,
      })
      onOpenChange(false)
      setTitle('')
      setSelectedEnsembles([])
      toastSuccess(t('toasts.sessionCreated'), {
        label: t('common.undo'),
        onUndo: async () => {
          try {
            await deleteSession.mutateAsync(created.id)
            toast.success(t('common.undone'))
          } catch {
            toast.error(t('errors.saveFailed'))
          }
        },
      })
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm">{t('sessions.new')}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('sessions.new')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={kind} onValueChange={(v) => setKind(v as Exclude<SessionKind, 'rehearsal'>)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['special_rehearsal', 'field_trip', 'exam', 'concert', 'other'] as const).map((k) => (
                <SelectItem key={k} value={k}>
                  {t(`kinds.${k}` as never)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <Input placeholder={t('session.title')} value={title} onChange={(e) => setTitle(e.target.value)} />
          <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          <div className="space-y-1">
            <p className="text-sm font-medium">{t('session.ensembles')}</p>
            {ensembles.map((e) => (
              <label key={e.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedEnsembles.includes(e.id)}
                  onChange={(ev) =>
                    setSelectedEnsembles((prev) => (ev.target.checked ? [...prev, e.id] : prev.filter((id) => id !== e.id)))
                  }
                />
                {e.name}
              </label>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!selectedEnsembles.length}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SessionDetailSheet({
  session,
  ensembles,
  onClose,
  onOpenAttendance,
}: {
  session: {
    id: string
    kind: string
    date: string
    title: string | null
    start_time: string | null
    status: 'scheduled' | 'held' | 'canceled'
    cancel_reason: string | null
    cancel_note: string | null
    rehearsal_note: string | null
    ensemble_ids: string[]
  } | null
  ensembles: { id: string; name: string }[]
  onClose: () => void
  onOpenAttendance: (ensembleId: string, date: string) => void
}) {
  const { t } = useI18n()
  const updateSession = useUpdateSession()
  const setSessionEnsembles = useSetSessionEnsembles()
  const deleteSession = useDeleteSession()

  if (!session) return null
  const isRehearsal = session.kind === 'rehearsal'
  const st = displayState(session.status, session.date)

  async function setState(next: DisplayState) {
    if (!session) return
    try {
      if (next === 'canceled') {
        await updateSession.mutateAsync({
          id: session.id,
          values: { status: 'canceled', cancel_reason: 'other', cancel_note: null },
        })
        toastSuccess(t('toasts.sessionCanceled'))
      } else if (next === 'held') {
        await updateSession.mutateAsync({ id: session.id, values: { status: 'held', cancel_reason: null, cancel_note: null } })
        toastSuccess(t('toasts.sessionUncanceled'))
      } else {
        await updateSession.mutateAsync({
          id: session.id,
          values: { status: 'scheduled', cancel_reason: null, cancel_note: null },
        })
        toastSuccess(t('toasts.sessionUncanceled'))
      }
      onClose()
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  return (
    <Sheet open={!!session} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{session.title || t(`kinds.${session.kind}` as never)}</SheetTitle>
        </SheetHeader>
        <div className="space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            {session.date} {session.start_time ? `· ${session.start_time.slice(0, 5)}` : ''}
          </p>

          <Select value={st} onValueChange={(v) => setState(v as DisplayState)}>
            <SelectTrigger className={cn('w-44 border-0', DISPLAY_STATE_CLASS[st])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={session.date > todayISO() ? 'future' : 'needs_entry'}>
                {t(`sessionStatuses.${session.date > todayISO() ? 'future' : 'needs_entry'}` as never)}
              </SelectItem>
              <SelectItem value="held">{t('sessionStatuses.held')}</SelectItem>
              <SelectItem value="canceled">{t('sessionStatuses.canceled')}</SelectItem>
            </SelectContent>
          </Select>

          {!isRehearsal && (
            <div className="space-y-1">
              <p className="text-sm font-medium">{t('session.ensembles')}</p>
              {ensembles.map((e) => (
                <label key={e.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={session.ensemble_ids.includes(e.id)}
                    onChange={async (ev) => {
                      const next = ev.target.checked
                        ? [...session.ensemble_ids, e.id]
                        : session.ensemble_ids.filter((id) => id !== e.id)
                      if (!next.length) return
                      try {
                        await setSessionEnsembles.mutateAsync({ sessionId: session.id, ensembleIds: next })
                      } catch {
                        toast.error(t('errors.saveFailed'))
                      }
                    }}
                  />
                  {e.name}
                </label>
              ))}
            </div>
          )}

          <Textarea
            defaultValue={session.rehearsal_note ?? ''}
            placeholder={t('attendance.rehearsalNotePlaceholder')}
            onBlur={(e) => updateSession.mutate({ id: session.id, values: { rehearsal_note: e.target.value } })}
          />

          <Button size="sm" onClick={() => session.ensemble_ids[0] && onOpenAttendance(session.ensemble_ids[0], session.date)}>
            {t('session.openAttendance')}
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              if (!confirm(t('session.deleteConfirm'))) return
              try {
                await deleteSession.mutateAsync(session.id)
                onClose()
                toastSuccess(t('toasts.sessionDeleted'))
              } catch {
                toast.error(t('errors.saveFailed'))
              }
            }}
          >
            {t('session.delete')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
