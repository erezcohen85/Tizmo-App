import type { ReactNode } from 'react'

/**
 * Emptiness is announced by space, not by a dashed box — UI-SPEC §4 ("No cards") and the
 * standing rule that borders must earn their place.
 */
export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 py-14 text-center">
      <p className="font-ui text-[15px] font-light text-dim">{title}</p>
      {hint && <p className="font-ui text-[12.5px] font-light text-faint">{hint}</p>}
      {action}
    </div>
  )
}
