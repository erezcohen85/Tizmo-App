import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { fromISODate, toISODate } from '@/lib/dates'

export function DateNav({
  date,
  onChange,
  availableDates,
}: {
  date: string
  onChange: (d: string) => void
  /** Sorted ascending ISO dates to skip between with prev/next. When omitted, prev/next step by one day. */
  availableDates?: string[]
}) {
  const earlier = availableDates
    ? [...availableDates].reverse().find((d) => d < date)
    : undefined
  const later = availableDates ? availableDates.find((d) => d > date) : undefined

  const hasNavList = availableDates !== undefined

  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => earlier && onChange(earlier)}
        disabled={hasNavList && !earlier}
        aria-label="prev session"
        className="text-faint transition-colors hover:text-lamp disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronLeft className="size-4 rtl:hidden" strokeWidth={1.4} />
        <ChevronRight className="hidden size-4 rtl:block" strokeWidth={1.4} />
      </button>
      <Popover>
        <PopoverTrigger asChild>
          <button type="button" className="font-ui text-[12.5px] font-light text-dim transition-colors hover:text-lamp">
            {date}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={fromISODate(date)}
            onSelect={(d) => d && onChange(toISODate(d))}
          />
        </PopoverContent>
      </Popover>
      <button
        type="button"
        onClick={() => later && onChange(later)}
        disabled={hasNavList && !later}
        aria-label="next session"
        className="text-faint transition-colors hover:text-lamp disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronRight className="size-4 rtl:hidden" strokeWidth={1.4} />
        <ChevronLeft className="hidden size-4 rtl:block" strokeWidth={1.4} />
      </button>
    </div>
  )
}
