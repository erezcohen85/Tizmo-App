import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { todayISO, weekdayKey } from '@/lib/dates'
import { toastSuccess } from '@/lib/toastUndo'
import { cn } from '@/lib/utils'
import {
  useBulkCreateRehearsals,
  useCreateEnsemble,
  useDeleteEnsemble,
  useUpdateEnsemble,
  type EnsembleWithWeekdays,
} from '@/queries/ensembles'

export const PRESET_COLORS = ['#0d9488', '#2563eb', '#7c3aed', '#db2777', '#dc2626', '#ea580c', '#ca8a04', '#16a34a']

type FormState = {
  name: string
  weekdays: number[]
  start_time: string
  duration_minutes: number
  location: string
  color: string
  seasonFrom: string
  seasonTo: string
}

function formFor(ensemble: EnsembleWithWeekdays | null, usedColors: string[]): FormState {
  if (ensemble) {
    return {
      name: ensemble.name,
      weekdays: ensemble.weekdays,
      start_time: ensemble.start_time.slice(0, 5),
      duration_minutes: ensemble.duration_minutes,
      location: ensemble.location ?? '',
      color: ensemble.color,
      seasonFrom: ensemble.season_start ?? '',
      seasonTo: ensemble.season_end ?? '',
    }
  }
  const used = new Set(usedColors.map((c) => c.toLowerCase()))
  return {
    name: '',
    weekdays: [],
    start_time: '17:00',
    duration_minutes: 60,
    location: '',
    color: PRESET_COLORS.find((c) => !used.has(c)) ?? PRESET_COLORS[0],
    seasonFrom: todayISO(),
    seasonTo: todayISO(),
  }
}

export function EnsembleFormDialog({
  open,
  onOpenChange,
  ensemble,
  usedColors,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** null = create mode */
  ensemble: EnsembleWithWeekdays | null
  usedColors: string[]
}) {
  const { t } = useI18n()
  const createEnsemble = useCreateEnsemble()
  const updateEnsemble = useUpdateEnsemble()
  const deleteEnsemble = useDeleteEnsemble()
  const bulkCreateRehearsals = useBulkCreateRehearsals()

  const [form, setForm] = useState<FormState>(() => formFor(ensemble, usedColors))

  function toggleWeekday(d: number) {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(d) ? f.weekdays.filter((x) => x !== d) : [...f.weekdays, d].sort((a, b) => a - b),
    }))
  }

  async function bulkCreate(ensembleId: string): Promise<number> {
    if (!form.seasonFrom || !form.seasonTo || form.seasonFrom > form.seasonTo) return 0
    try {
      return await bulkCreateRehearsals.mutateAsync({
        ensembleId,
        from: form.seasonFrom,
        to: form.seasonTo,
        weekdays: form.weekdays,
      })
    } catch {
      toast.error(t('errors.saveFailed'))
      return 0
    }
  }

  async function submit() {
    if (!form.weekdays.length) return
    const values = {
      name: form.name,
      start_time: form.start_time,
      duration_minutes: form.duration_minutes,
      location: form.location || null,
      color: form.color,
      season_start: form.seasonFrom || null,
      season_end: form.seasonTo || null,
    }
    try {
      if (ensemble) {
        const before = ensemble
        await updateEnsemble.mutateAsync({ id: ensemble.id, values, weekdays: form.weekdays })
        onOpenChange(false)
        const created = await bulkCreate(ensemble.id)
        toastSuccess(
          created > 0
            ? `${t('toasts.ensembleUpdated')} — ${created} ${t('manage.rehearsalsCreated')}`
            : t('toasts.ensembleUpdated'),
          {
            label: t('common.undo'),
            onUndo: async () => {
              try {
                await updateEnsemble.mutateAsync({
                  id: before.id,
                  values: {
                    name: before.name,
                    start_time: before.start_time,
                    duration_minutes: before.duration_minutes,
                    location: before.location,
                    color: before.color,
                    season_start: before.season_start,
                    season_end: before.season_end,
                  },
                  weekdays: before.weekdays,
                })
                toast.success(t('common.undone'))
              } catch {
                toast.error(t('errors.saveFailed'))
              }
            },
          },
        )
      } else {
        const created = await createEnsemble.mutateAsync({ values, weekdays: form.weekdays })
        onOpenChange(false)
        const rehearsals = await bulkCreate(created.id)
        toastSuccess(
          rehearsals > 0
            ? `${t('toasts.ensembleCreated')} — ${rehearsals} ${t('manage.rehearsalsCreated')}`
            : t('toasts.ensembleCreated'),
          {
            label: t('common.undo'),
            onUndo: async () => {
              try {
                await deleteEnsemble.mutateAsync(created.id)
                toast.success(t('common.undone'))
              } catch {
                toast.error(t('errors.saveFailed'))
              }
            },
          },
        )
      }
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ensemble ? t('home.ensembleSettings') : t('home.newEnsemble')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

          <div className="space-y-1">
            <p className="text-sm font-medium">{t('manage.weeklyDays')}</p>
            <div className="flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <label key={d} className="flex items-center gap-1 text-sm">
                  <input type="checkbox" checked={form.weekdays.includes(d)} onChange={() => toggleWeekday(d)} />
                  {t(weekdayKey(d) as never)}
                </label>
              ))}
            </div>
          </div>

          <Input type="time" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
          <Input
            type="number"
            min={1}
            value={form.duration_minutes}
            onChange={(e) => setForm({ ...form, duration_minutes: Number(e.target.value) })}
          />
          <Input
            placeholder={t('session.location')}
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
          />

          <div className="space-y-1">
            <p className="text-sm font-medium">{t('manage.color')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={cn(
                    'size-7 rounded-full border-2',
                    form.color.toLowerCase() === c ? 'border-foreground' : 'border-transparent',
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="size-7 cursor-pointer rounded border bg-transparent"
                aria-label={t('manage.color')}
              />
            </div>
          </div>

          <div className="space-y-1 border-t pt-3">
            <p className="text-sm font-medium">{t('manage.season')}</p>
            <div className="flex items-center gap-2">
              <Input type="date" value={form.seasonFrom} onChange={(e) => setForm({ ...form, seasonFrom: e.target.value })} />
              <span className="text-sm text-muted-foreground">{t('history.to')}</span>
              <Input type="date" value={form.seasonTo} onChange={(e) => setForm({ ...form, seasonTo: e.target.value })} />
            </div>
            <p className="text-xs text-muted-foreground">{t('manage.seasonHint')}</p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={!form.weekdays.length}>
            {t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
