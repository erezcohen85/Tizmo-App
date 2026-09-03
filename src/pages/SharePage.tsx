import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useI18n } from '@/i18n'
import { shiftISODate, todayISO } from '@/lib/dates'
import { exportRows } from '@/lib/export'
import { callShareHistory, type ShareHistoryResponse } from '@/lib/functions'

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

  const [activeTab, setActiveTab] = useState('bySession')

  if (state.status === 'loading') return <div className="p-6 text-sm text-muted-foreground">…</div>
  if (state.status === 'error') {
    return (
      <div className="p-6">
        <p>{state.error === 'revoked' ? t('share.revoked') : t('share.invalid')}</p>
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
    <div className="mx-auto max-w-6xl space-y-4 p-4">
      <div className="flex items-center justify-between">
        <span className="font-semibold">{t('app.name')}</span>
        <div className="flex overflow-hidden rounded-md border text-sm">
          <button type="button" onClick={() => setLang('he')} className={lang === 'he' ? 'bg-primary px-2 py-1 text-primary-foreground' : 'px-2 py-1'}>
            עברית
          </button>
          <button type="button" onClick={() => setLang('en')} className={lang === 'en' ? 'bg-primary px-2 py-1 text-primary-foreground' : 'px-2 py-1'}>
            EN
          </button>
        </div>
      </div>

      {data.truncated && <p className="rounded bg-accent p-2 text-sm">{t('share.truncated')}</p>}

      <div className="flex flex-wrap items-end gap-2">
        {data.scope === 'all' && (
          <Select value={ensembleId ?? '__all__'} onValueChange={(v) => setEnsembleId(v === '__all__' ? undefined : v)}>
            <SelectTrigger className="w-48">
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
          <SelectTrigger className="w-40">
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
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
        <div className="ms-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
            {t('history.exportCsv')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => handleExport('xlsx')}>
            {t('history.exportExcel')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="bySession">{t('history.bySession')}</TabsTrigger>
          <TabsTrigger value="byStudent">{t('history.byStudent')}</TabsTrigger>
        </TabsList>
        <TabsContent value="bySession" className="overflow-x-auto">
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
        </TabsContent>
        <TabsContent value="byStudent" className="overflow-x-auto">
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
        </TabsContent>
      </Tabs>
    </div>
  )
}
