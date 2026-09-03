import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => earlier && onChange(earlier)}
        disabled={hasNavList && !earlier}
        aria-label="prev session"
      >
        <ChevronLeft className="size-4" />
      </Button>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="min-w-32">
            {date}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={fromISODate(date)}
            onSelect={(d) => d && onChange(toISODate(d))}
          />
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        onClick={() => later && onChange(later)}
        disabled={hasNavList && !later}
        aria-label="next session"
      >
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
