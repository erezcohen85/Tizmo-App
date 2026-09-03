import { todayISO } from './dates'

/** Stored session status in the database. */
export type SessionStatus = 'scheduled' | 'held' | 'canceled'

/** What the user sees: 'scheduled' splits into future / needs-entry based on the date. */
export type DisplayState = 'future' | 'needs_entry' | 'held' | 'canceled'

export function displayState(status: SessionStatus, date: string, today = todayISO()): DisplayState {
  if (status === 'canceled') return 'canceled'
  if (status === 'held') return 'held'
  return date > today ? 'future' : 'needs_entry'
}

export const DISPLAY_STATE_CLASS: Record<DisplayState, string> = {
  future: 'bg-muted text-muted-foreground',
  needs_entry: 'bg-amber-500 text-white',
  held: 'bg-emerald-600 text-white',
  canceled: 'bg-rose-600 text-white',
}

/** Filter options offered in the Sessions screen. */
export const DISPLAY_STATES: DisplayState[] = ['future', 'needs_entry', 'held', 'canceled']
