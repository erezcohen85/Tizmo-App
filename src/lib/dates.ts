import { addDays, format, parseISO } from 'date-fns'

export function toISODate(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

export function fromISODate(s: string): Date {
  return parseISO(s)
}

export function todayISO(): string {
  return toISODate(new Date())
}

export function shiftISODate(s: string, days: number): string {
  return toISODate(addDays(fromISODate(s), days))
}

/** 0 = Sunday .. 6 = Saturday, matching Postgres/JS Date#getDay() */
export function nextOrTodayForWeekday(weeklyDay: number, from = new Date()): string {
  const currentDay = from.getDay()
  const diff = (weeklyDay - currentDay + 7) % 7
  return toISODate(addDays(from, diff))
}

const WEEKDAY_KEYS = [
  'weekdays.sunday',
  'weekdays.monday',
  'weekdays.tuesday',
  'weekdays.wednesday',
  'weekdays.thursday',
  'weekdays.friday',
  'weekdays.saturday',
] as const

export function weekdayKey(weeklyDay: number): (typeof WEEKDAY_KEYS)[number] {
  return WEEKDAY_KEYS[weeklyDay]
}
