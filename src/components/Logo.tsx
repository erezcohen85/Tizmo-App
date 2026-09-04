import { cn } from '@/lib/utils'

/**
 * The Tizmo wordmark: the name in Fraunces Light with a bow stroke beneath it —
 * one swelling line, pressure in the middle, lifting at both ends.
 *
 * The word inherits `currentColor`; the stroke is always the lamp accent.
 * Fraunces is loaded in `index.html`.
 */
export function Logo({ className, title = 'Tizmo' }: { className?: string; title?: string }) {
  return (
    <svg
      viewBox="28 34 306 116"
      role="img"
      aria-label={title}
      className={cn('h-[30px] w-auto text-score', className)}
    >
      <text
        x="180"
        y="106"
        textAnchor="middle"
        fontFamily="Fraunces, Georgia, serif"
        fontWeight="300"
        fontSize="80"
        letterSpacing="1"
        fill="currentColor"
      >
        Tizmo
      </text>
      <path
        d="M 38 132 C 100 116, 150 144, 200 130 C 248 117, 296 140, 322 126"
        fill="none"
        stroke="hsl(var(--lamp))"
        strokeWidth="5"
        strokeLinecap="round"
      />
    </svg>
  )
}
