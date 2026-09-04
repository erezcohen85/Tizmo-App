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

/** Word colour per state — spec §5 "Session state": a word, not a badge. */
export const DISPLAY_STATE_CLASS: Record<DisplayState, string> = {
  future: 'text-faint',
  needs_entry: 'text-lamp',
  held: 'text-status-present',
  canceled: 'text-status-absent',
}

/** Filter options offered in the Sessions screen. */
export const DISPLAY_STATES: DisplayState[] = ['future', 'needs_entry', 'held', 'canceled']
