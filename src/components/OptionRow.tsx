import { cn } from '@/lib/utils'

export function OptionRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex gap-5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'font-ui text-[12.5px] font-light transition-colors',
            value === opt.value ? 'text-lamp' : 'text-dim hover:text-score',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
