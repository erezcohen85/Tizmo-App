import { useI18n } from '@/i18n'
import { useTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

function OptionRow<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'font-ui text-[12.5px] font-light transition-colors',
            value === opt.value ? 'text-lamp' : 'text-dim hover:text-score',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()

  const themes: { value: Theme; label: string }[] = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-11">
      <section className="space-y-6">
        <p className="font-alt text-[11.5px] tracking-[.18em] text-faint">{t('settings.appearance').toUpperCase()}</p>

        <div className="space-y-2">
          <p className="text-[12px] text-faint">{t('settings.theme')}</p>
          <OptionRow options={themes} value={theme} onChange={setTheme} />
        </div>

        <div className="space-y-2">
          <p className="text-[12px] text-faint">{t('settings.language')}</p>
          <OptionRow
            options={[
              { value: 'he' as const, label: 'עברית' },
              { value: 'en' as const, label: 'English' },
            ]}
            value={lang}
            onChange={setLang}
          />
        </div>
      </section>

      <section className="space-y-2 shadow-separator pt-6">
        <p className="font-alt text-[11.5px] tracking-[.18em] text-faint">{t('settings.account').toUpperCase()}</p>
        <p className="text-[13px] text-dim">{t('settings.accountHint')}</p>
      </section>

      <section className="space-y-2 shadow-separator pt-6">
        <p className="font-alt text-[11.5px] tracking-[.18em] text-faint">{t('settings.about').toUpperCase()}</p>
        <p className="text-[13px] text-dim">{t('settings.aboutText')}</p>
        <p className="text-[13px] text-dim">{t('app.name')}</p>
      </section>
    </div>
  )
}
