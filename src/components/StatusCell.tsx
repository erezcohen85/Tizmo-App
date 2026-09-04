import { Check, Clock, Shield, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'present' | 'absent' | 'late' | 'excused'

const ICONS: Record<Status, typeof Check> = { present: Check, absent: X, late: Clock, excused: Shield }
const STATUS_VAR: Record<Status, string> = {
  present: '--status-present',
  absent: '--status-absent',
  late: '--status-late',
  excused: '--status-excused',
}

export function StatusCell({
  status,
  current,
  disabled,
  onChange,
  label,
}: {
  status: Status
  current: Status | null
  disabled?: boolean
  onChange: (next: Status | null) => void
  label: string
}) {
  const active = current === status
  const Icon = ICONS[status]
  const colorVar = `hsl(var(${STATUS_VAR[status]}))`
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={() => onChange(active ? null : status)}
      className={cn(
        'inline-flex size-11 items-center justify-center rounded-full transition-colors duration-300',
        disabled && 'opacity-50',
      )}
      style={{
        color: active ? colorVar : 'hsl(var(--faint) / var(--faint-a))',
        backgroundColor: active ? `hsl(var(${STATUS_VAR[status]}) / 0.13)` : 'transparent',
      }}
    >
      <Icon className="size-[19px]" strokeWidth={1.4} />
    </button>
  )
}
