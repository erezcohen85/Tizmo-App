import { useMemo, useState, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { GripVertical, LayoutGrid, List, MoreVertical, Plus, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/EmptyState'
import { EnsembleDot } from '@/components/EnsembleDot'
import { EnsembleFormDialog } from '@/components/EnsembleFormDialog'
import { ShareLinkDialog } from '@/components/ShareLinkDialog'
import { useI18n } from '@/i18n'
import { todayISO, weekdayKey } from '@/lib/dates'
import { displayState } from '@/lib/sessionState'
import { cn } from '@/lib/utils'
import { useEnsembles, useReorderEnsembles, type EnsembleWithWeekdays } from '@/queries/ensembles'
import { useMemberships } from '@/queries/students'
import { useSessionsInRange } from '@/queries/sessions'

export default function HomePage() {
  const { t } = useI18n()
  const { data: ensembles } = useEnsembles()
  const { data: memberships } = useMemberships()

  const today = todayISO()
  const rangeFrom = useMemo(() => `${Number(today.slice(0, 4)) - 1}${today.slice(4)}`, [today])
  const rangeTo = useMemo(() => `${Number(today.slice(0, 4)) + 1}${today.slice(4)}`, [today])
  const { data: sessions } = useSessionsInRange(rangeFrom, rangeTo)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<EnsembleWithWeekdays | null>(null)
  const [shareFor, setShareFor] = useState<EnsembleWithWeekdays | null>(null)
  const [shareAllOpen, setShareAllOpen] = useState(false)

  const todayWeekday = new Date().getDay()
  const [dayFilter, setDayFilter] = useState<number | undefined>(undefined)
  const [view, setView] = useState<'cards' | 'list'>(() =>
    localStorage.getItem('home.view') === 'list' ? 'list' : 'cards',
  )

  type SortMode = 'custom' | 'az' | 'dayTime'
  const [sortMode, setSortMode] = useState<SortMode>(() => {
    const stored = localStorage.getItem('home.sort')
    return stored === 'az' || stored === 'dayTime' ? stored : 'custom'
  })

  const reorder = useReorderEnsembles()
  const [dragId, setDragId] = useState<string | null>(null)

  function changeView(next: 'cards' | 'list') {
    localStorage.setItem('home.view', next)
    setView(next)
  }

  function changeSort(next: SortMode) {
    localStorage.setItem('home.sort', next)
    setSortMode(next)
  }

  function openCreate() {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(e: EnsembleWithWeekdays) {
    setEditing(e)
    setFormOpen(true)
  }

  if (!ensembles) return null

  const filteredEnsembles = dayFilter === undefined ? ensembles : ensembles.filter((e) => e.weekdays.includes(dayFilter))

  const visible = [...filteredEnsembles].sort((a, b) => {
    if (sortMode === 'az') return a.name.localeCompare(b.name)
    if (sortMode === 'dayTime') {
      const dayA = a.weekdays.length ? Math.min(...a.weekdays) : 99
      const dayB = b.weekdays.length ? Math.min(...b.weekdays) : 99
      if (dayA !== dayB) return dayA - dayB
      return a.start_time.localeCompare(b.start_time)
    }
    return 0 // custom: already ordered by sort_order from the query
  })

  const canDrag = sortMode === 'custom' && dayFilter === undefined

  async function handleDrop(targetId: string) {
    if (!dragId || dragId === targetId) return
    const ids = visible.map((e) => e.id)
    const from = ids.indexOf(dragId)
    const to = ids.indexOf(targetId)
    if (from < 0 || to < 0) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    setDragId(null)
    try {
      await reorder.mutateAsync(ids)
    } catch {
      /* invalidation restores the server order */
    }
  }

  function dragProps(id: string) {
    if (!canDrag) return {}
    return {
      draggable: true,
      onDragStart: () => setDragId(id),
      onDragEnd: () => setDragId(null),
      onDragOver: (e: DragEvent) => e.preventDefault(),
      onDrop: () => handleDrop(id),
    }
  }

  function statsFor(e: EnsembleWithWeekdays) {
    const memberCount = (memberships ?? []).filter(
      (m) => m.ensemble_id === e.id && m.joined_on <= today && (!m.terminated_on || m.terminated_on >= today),
    ).length
    const own = (sessions ?? []).filter((s) => s.ensemble_ids.includes(e.id))
    const next = own
      .filter((s) => s.date >= today && s.status !== 'canceled')
      .sort((a, b) => a.date.localeCompare(b.date))[0]
    const needsEntry = own.filter((s) => displayState(s.status, s.date, today) === 'needs_entry').length
    return { memberCount, next, needsEntry }
  }

  async function move(id: string, delta: -1 | 1) {
    const ids = visible.map((x) => x.id)
    const from = ids.indexOf(id)
    const to = from + delta
    if (from < 0 || to < 0 || to >= ids.length) return
    ids.splice(to, 0, ids.splice(from, 1)[0])
    try {
      await reorder.mutateAsync(ids)
    } catch {
      /* invalidation restores the server order */
    }
  }

  function EnsembleMenu({ e, index }: { e: EnsembleWithWeekdays; index: number }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={t('home.ensembleSettings')}>
            <MoreVertical className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openEdit(e)}>{t('home.ensembleSettings')}</DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShareFor(e)}>{t('home.ensembleShare')}</DropdownMenuItem>
          {canDrag && (
            <>
              <DropdownMenuItem disabled={index === 0} onClick={() => move(e.id, -1)}>
                {t('home.moveUp')}
              </DropdownMenuItem>
              <DropdownMenuItem disabled={index === visible.length - 1} onClick={() => move(e.id, 1)}>
                {t('home.moveDown')}
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 font-ui text-[12.5px] font-light">
        <button type="button" onClick={openCreate} className="inline-flex items-center gap-1.5 text-dim transition-colors hover:text-lamp">
          <Plus className="size-3.5" strokeWidth={1.4} />
          {t('home.newEnsemble')}
        </button>
        <button
          type="button"
          onClick={() => setShareAllOpen(true)}
          className="inline-flex items-center gap-1.5 text-dim transition-colors hover:text-lamp"
        >
          <Share2 className="size-3.5" strokeWidth={1.4} />
          {t('home.shareAll')}
        </button>

        <Select
          value={dayFilter === undefined ? '__all__' : String(dayFilter)}
          onValueChange={(v) => setDayFilter(v === '__all__' ? undefined : Number(v))}
        >
          <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent p-0 text-[12.5px] font-light text-dim shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">{t('home.allDays')}</SelectItem>
            {[0, 1, 2, 3, 4, 5, 6].map((d) => (
              <SelectItem key={d} value={String(d)}>
                {t(weekdayKey(d) as never)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={() => setDayFilter(dayFilter === todayWeekday ? undefined : todayWeekday)}
          className={cn(
            'font-normal text-lamp underline-offset-4 transition-colors',
            dayFilter === todayWeekday && 'underline',
          )}
        >
          {t('home.today')}
        </button>

        <Select value={sortMode} onValueChange={(v) => changeSort(v as SortMode)}>
          <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent p-0 text-[12.5px] font-light text-dim shadow-none focus:ring-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="custom">{t('home.sortCustom')}</SelectItem>
            <SelectItem value="az">{t('home.sortAZ')}</SelectItem>
            <SelectItem value="dayTime">{t('home.sortDayTime')}</SelectItem>
          </SelectContent>
        </Select>

        <div className="ms-auto flex items-center gap-3">
          <button
            type="button"
            aria-label={t('home.viewCards')}
            title={t('home.viewCards')}
            onClick={() => changeView('cards')}
            className={view === 'cards' ? 'text-lamp' : 'text-faint hover:text-dim'}
          >
            <LayoutGrid className="size-4" strokeWidth={1.4} />
          </button>
          <button
            type="button"
            aria-label={t('home.viewList')}
            title={t('home.viewList')}
            onClick={() => changeView('list')}
            className={view === 'list' ? 'text-lamp' : 'text-faint hover:text-dim'}
          >
            <List className="size-4" strokeWidth={1.4} />
          </button>
        </div>
      </div>

      {ensembles.length === 0 ? (
        <EmptyState
          title={t('home.noEnsembles')}
          hint={t('home.noEnsemblesHint')}
          action={<Button onClick={openCreate}>{t('home.newEnsemble')}</Button>}
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title={t('home.noEnsemblesOnDay')}
          action={
            <Button variant="outline" onClick={() => setDayFilter(undefined)}>
              {t('home.allDays')}
            </Button>
          }
        />
      ) : view === 'cards' ? (
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((e, index) => {
            const { memberCount, next, needsEntry } = statsFor(e)
            return (
              <div
                key={e.id}
                {...dragProps(e.id)}
                className={cn('relative py-3.5 shadow-separator', canDrag && 'cursor-grab', dragId === e.id && 'opacity-50')}
              >
                <div className="absolute end-0 top-3">
                  <EnsembleMenu e={e} index={index} />
                </div>

                <Link to={`/ensemble/${e.id}`} className="block pe-12">
                  <p className="flex items-center gap-2 text-[15.5px] tracking-[-.005em] text-score">
                    {canDrag && (
                      <GripVertical
                        className="size-3.5 shrink-0 text-dim transition-colors hover:text-lamp"
                        aria-label={t('home.dragHint')}
                      />
                    )}
                    <EnsembleDot color={e.color} />
                    {e.name}
                    {needsEntry > 0 && <span className="size-[5px] rounded-full bg-lamp" aria-label={t('home.needsEntry')} />}
                  </p>
                  <p className="mt-[3px] text-[11.5px] text-faint">
                    {e.weekdays.map((d) => t(weekdayKey(d) as never)).join(', ')} · {e.start_time.slice(0, 5)} · {memberCount}{' '}
                    {t('home.students')}
                    {next && <> · {t('home.nextSession')} {next.date}</>}
                  </p>
                </Link>
              </div>
            )
          })}
        </div>
      ) : (
        <ul>
          {visible.map((e, index) => {
            const { memberCount, next, needsEntry } = statsFor(e)
            return (
              <li
                key={e.id}
                {...dragProps(e.id)}
                className={cn('flex flex-wrap items-center gap-3 py-3.5 shadow-separator', canDrag && 'cursor-grab', dragId === e.id && 'opacity-50')}
              >
                {canDrag && <GripVertical className="size-3.5 text-dim transition-colors hover:text-lamp" aria-label={t('home.dragHint')} />}
                <EnsembleDot color={e.color} />
                <Link to={`/ensemble/${e.id}`} className="min-w-40 flex-1">
                  <p className="text-[15.5px] tracking-[-.005em] text-score">{e.name}</p>
                  <p className="mt-[3px] text-[11.5px] text-faint">
                    {e.weekdays.map((d) => t(weekdayKey(d) as never)).join(', ')} · {e.start_time.slice(0, 5)} · {memberCount}{' '}
                    {t('home.students')}
                    {next && <> · {t('home.nextSession')} {next.date}</>}
                  </p>
                </Link>
                {needsEntry > 0 && <span className="size-[5px] rounded-full bg-lamp" aria-label={t('home.needsEntry')} />}
                <EnsembleMenu e={e} index={index} />
              </li>
            )
          })}
        </ul>
      )}

      {formOpen && (
        <EnsembleFormDialog
          key={editing?.id ?? 'new'}
          open={formOpen}
          onOpenChange={setFormOpen}
          ensemble={editing}
          usedColors={ensembles.map((e) => e.color)}
        />
      )}

      {shareFor && (
        <ShareLinkDialog
          key={shareFor.id}
          open={!!shareFor}
          onOpenChange={(v) => !v && setShareFor(null)}
          ensembleId={shareFor.id}
          ensembleName={shareFor.name}
        />
      )}

      <ShareLinkDialog open={shareAllOpen} onOpenChange={setShareAllOpen} />
    </div>
  )
}
