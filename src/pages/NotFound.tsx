/**
 * The tally sets the display scale for this app (UI-SPEC §3: Assistant 200, tabular figures),
 * so a 404 reads as one quiet number rather than stray body text.
 */
export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-2 py-24 text-center">
      <p className="font-ui text-[52px] font-extralight leading-none tracking-[-.035em] tabular-nums text-faint">
        404
      </p>
    </div>
  )
}
