import { Check, Clock, Shield, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'present' | 'absent' | 'late' | 'excused'

const ICONS: Record<Status, typeof Check> = { present: Check, absent: X, late: Clock, excused: Shield }
const ACTIVE_CLASS: Record<Status, string> = {
  present: 'bg-status-present text-white border-status-present',
  absent: 'bg-status-absent text-white border-status-absent',
  late: 'bg-status-late text-white border-status-late',
  excused: 'bg-status-excused text-white border-status-excused',
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
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(active ? null : status)}
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-md border text-muted-foreground transition-colors',
        active ? ACTIVE_CLASS[status] : 'hover:bg-accent',
        disabled && 'opacity-50',
      )}
    >
      <Icon className="size-4" />
    </button>
  )
}
