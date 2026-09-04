import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { OptionRow } from '@/components/OptionRow'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/i18n'
import { shiftISODate, todayISO } from '@/lib/dates'
import { exportRows } from '@/lib/export'
import { callShareHistory, type ShareHistoryResponse } from '@/lib/functions'

const FILTER_TRIGGER_CLASS =
  'h-auto w-auto gap-1 border-0 bg-transparent p-0 text-[12.5px] font-light text-dim shadow-none focus:ring-0'

export default function SharePage() {
  const { t, lang, setLang } = useI18n()
  const { token } = useParams<{ token: string }>()
  const [params, setParams] = useSearchParams()

  const [ensembleId, setEnsembleId] = useState(params.get('ensemble') ?? undefined)
  const [kind, setKind] = useState(params.get('kind') ?? undefined)
  const [from, setFrom] = useState(params.get('from') ?? shiftISODate(todayISO(), -90))
  const [to, setTo] = useState(params.get('to') ?? todayISO())

  const [state, setState] = useState<
    { status: 'loading' } | { status: 'error'; error: string } | { status: 'ok'; data: ShareHistoryResponse }
  >({ status: 'loading' })

  useEffect(() => {
    if (!token) return
    setState({ status: 'loading' })
    callShareHistory({ token, ensemble: ensembleId, kind, from, to }).then((res) => {
      if (res.ok) setState({ status: 'ok', data: res.data })
      else setState({ status: 'error', error: res.error })
    })
    const p = new URLSearchParams()
    if (ensembleId) p.set('ensemble', ensembleId)
    if (kind) p.set('kind', kind)
    p.set('from', from)
    p.set('to', to)
    setParams(p, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, ensembleId, kind, from, to])

  const [activeTab, setActiveTab] = useState<'bySession' | 'byStudent'>('bySession')

  if (state.status === 'loading') {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-stage">
        <p className="text-[15px] font-light text-faint">…</p>
      </div>
    )
  }
  if (state.status === 'error') {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-stage px-5 text-center">
        <Logo className="h-9 w-auto" title={t('app.name')} />
        <p className="text-[15px] font-light text-dim">{state.error === 'revoked' ? t('share.revoked') : t('share.invalid')}</p>
      </div>
    )
  }

  const { data } = state

  const sessionRows = data.sessions.map((s) => {
    const rosterSize = s.roster_student_ids.length
    const present = s.attendance.filter((a) => a.status === 'present').length
    const late = s.attendance.filter((a) => a.status === 'late').length
    const absent = s.attendance.filter((a) => a.status === 'absent').length
    const excused = s.attendance.filter((a) => a.status === 'excused').length
    const unmarked = rosterSize - present - late - absent - excused
    const pct = s.status === 'held' && rosterSize > 0 ? Math.round(((present + late) / rosterSize) * 1000) / 10 : null
    return {
      date: s.date,
      kind: t(`kinds.${s.kind}` as never),
      title: s.title ?? '',
      ensembles: s.ensemble_ids.map((id) => data.ensembles.find((e) => e.id === id)?.name).filter(Boolean).join(', '),
      status: t(`sessionStatuses.${s.status}` as never),
      present,
      absent,
      late,
      excused,
      unmarked,
      percentage: pct === null ? '—' : `${pct}%`,
    }
  })

  const studentRows = data.students.map((s) => {
    let counted = 0
    let present = 0
    let late = 0
    for (const session of data.sessions) {
      if (session.status !== 'held') continue
      if (!session.roster_student_ids.includes(s.id)) continue
      counted += 1
      const a = session.attendance.find((x) => x.student_id === s.id)
      if (a?.status === 'present') present += 1
      if (a?.status === 'late') late += 1
    }
    const pct = counted > 0 ? Math.round(((present + late) / counted) * 1000) / 10 : null
    return {
      name: `${s.first_name} ${s.last_name}`,
      instrument: s.instrument ?? '',
      grade: s.grade ?? '',
      sessions: counted,
      percentage: pct === null ? '—' : `${pct}%`,
    }
  })

  function handleExport(format: 'csv' | 'xlsx') {
    const filename = `attendance-share-${from}-${to}.${format}`
    if (activeTab === 'bySession') exportRows(sessionRows, filename, format)
    else exportRows(studentRows, filename, format)
  }

  return (
    <div className="min-h-dvh bg-stage px-5 pb-16 pt-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <Logo className="h-8 w-auto" title={t('app.name')} />
          <OptionRow
            options={[
              { value: 'he' as const, label: 'עברית' },
              { value: 'en' as const, label: 'English' },
            ]}
            value={lang}
            onChange={setLang}
          />
        </div>

        {data.truncated && <p className="font-alt text-[11.5px] tracking-[.1em] text-faint">{t('share.truncated')}</p>}

        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-ui text-[12.5px] font-light">
          {data.scope === 'all' && (
            <Select value={ensembleId ?? '__all__'} onValueChange={(v) => setEnsembleId(v === '__all__' ? undefined : v)}>
              <SelectTrigger className={FILTER_TRIGGER_CLASS}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('manage.allEnsembles')}</SelectItem>
                {data.ensembles.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Select value={kind ?? '__all__'} onValueChange={(v) => setKind(v === '__all__' ? undefined : v)}>
            <SelectTrigger className={FILTER_TRIGGER_CLASS}>
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
          <div className="flex items-center gap-1.5 text-dim">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border-0 bg-transparent font-ui text-[12.5px] font-light text-dim outline-none"
            />
            <span className="text-faint">{t('history.to')}</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border-0 bg-transparent font-ui text-[12.5px] font-light text-dim outline-none"
            />
          </div>
          <div className="ms-auto flex items-center gap-4">
            <button type="button" onClick={() => handleExport('csv')} className="text-dim transition-colors hover:text-lamp">
              {t('history.exportCsv')}
            </button>
            <button type="button" onClick={() => handleExport('xlsx')} className="text-dim transition-colors hover:text-lamp">
              {t('history.exportExcel')}
            </button>
          </div>
        </div>

        <OptionRow
          options={[
            { value: 'bySession' as const, label: t('history.bySession') },
            { value: 'byStudent' as const, label: t('history.byStudent') },
          ]}
          value={activeTab}
          onChange={setActiveTab}
        />

        {activeTab === 'bySession' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('attendance.date')}</TableHead>
                <TableHead>Kind</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Ensembles</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>P</TableHead>
                <TableHead>A</TableHead>
                <TableHead>L</TableHead>
                <TableHead>E</TableHead>
                <TableHead>?</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessionRows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.kind}</TableCell>
                  <TableCell>{r.title}</TableCell>
                  <TableCell>{r.ensembles}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell>{r.present}</TableCell>
                  <TableCell>{r.absent}</TableCell>
                  <TableCell>{r.late}</TableCell>
                  <TableCell>{r.excused}</TableCell>
                  <TableCell>{r.unmarked}</TableCell>
                  <TableCell>{r.percentage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {activeTab === 'byStudent' && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Instrument</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Sessions</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentRows.map((r, i) => (
                <TableRow key={i}>
                  <TableCell>{r.name}</TableCell>
                  <TableCell>{r.instrument}</TableCell>
                  <TableCell>{r.grade}</TableCell>
                  <TableCell>{r.sessions}</TableCell>
                  <TableCell>{r.percentage}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
