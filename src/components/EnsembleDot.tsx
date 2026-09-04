import { cn } from '@/lib/utils'

export function EnsembleDot({ color, className }: { color: string; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('inline-block size-1.5 shrink-0 rounded-full', className)}
      style={{ backgroundColor: color }}
    />
  )
}
