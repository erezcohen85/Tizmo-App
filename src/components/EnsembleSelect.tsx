import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EnsembleDot } from '@/components/EnsembleDot'
import { useI18n } from '@/i18n'
import type { Tables } from '@/lib/database.types'

export function EnsembleSelect({
  ensembles,
  value,
  onChange,
  allowAll,
}: {
  ensembles: Tables<'ensembles'>[]
  value: string | undefined
  onChange: (id: string | undefined) => void
  allowAll?: boolean
}) {
  const { t } = useI18n()
  return (
    <Select value={value ?? '__all__'} onValueChange={(v) => onChange(v === '__all__' ? undefined : v)}>
      <SelectTrigger className="h-auto w-auto gap-1 border-0 bg-transparent p-0 font-ui text-[12.5px] font-light text-dim shadow-none focus:ring-0">
        <SelectValue placeholder={t('attendance.ensemble')} />
      </SelectTrigger>
      <SelectContent>
        {allowAll && <SelectItem value="__all__">{t('manage.allEnsembles')}</SelectItem>}
        {ensembles.map((e) => (
          <SelectItem key={e.id} value={e.id}>
            <span className="flex items-center gap-2">
              <EnsembleDot color={e.color} />
              {e.name}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
