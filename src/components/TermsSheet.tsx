import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useI18n } from '@/i18n'
import { legalContent } from '@/legal/content'

export function TermsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t, lang } = useI18n()
  const sections = legalContent[lang]

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto bg-stage">
        <SheetHeader>
          <SheetTitle className="font-ui text-[15.5px] font-normal text-score">{t('legal.title')}</SheetTitle>
        </SheetHeader>
        <div className="mx-auto max-w-2xl space-y-8 pb-10 pt-4">
          <p className="font-alt text-[11px] tracking-[.14em] text-faint">{t('legal.lastUpdated')}</p>
          {sections.map((s) => (
            <div key={s.heading} className="space-y-2">
              <p className="font-alt text-[11.5px] tracking-[.14em] text-faint">{s.heading}</p>
              <p className="whitespace-pre-line text-[15px] font-light leading-[1.85] text-dim">{s.body}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
