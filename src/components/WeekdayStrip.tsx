import { useI18n } from '@/i18n'
import { cn } from '@/lib/utils'

const DAY_KEYS = [
  'weekdayLetters.sunday',
  'weekdayLetters.monday',
  'weekdayLetters.tuesday',
  'weekdayLetters.wednesday',
  'weekdayLetters.thursday',
  'weekdayLetters.friday',
  'weekdayLetters.saturday',
] as const

/**
 * The seven weekday letters, rehearsal days lit and the rest held back — UI-SPEC §5:
 * "Weekday letters in Alef 10.5px, 7px apart; rehearsal days at full `score`, the rest at
 * `faint`. This replaces the `Monday · 20:00 · 35 students` string — a glance instead of a read."
 *
 * The letters are content rather than icons, so they come from the dictionary and change with
 * the language (§7); the strip itself is laid out in document order and flips with `dir`.
 */
export function WeekdayStrip({ days, className }: { days: number[]; className?: string }) {
  const { t } = useI18n()
  const active = new Set(days)

  return (
    <span className={cn('inline-flex gap-[7px] font-alt text-[10.5px] leading-none', className)}>
      {DAY_KEYS.map((key, day) => (
        <span key={key} className={active.has(day) ? 'text-score' : 'text-faint'}>
          {t(key as never)}
        </span>
      ))}
    </span>
  )
}
