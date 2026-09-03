import { Button } from '@/components/ui/button'
import { useI18n } from '@/i18n'
import { useTheme, type Theme } from '@/lib/theme'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()

  const themes: { value: Theme; label: string }[] = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <section className="space-y-3 rounded-lg border p-4">
        <h2 className="font-semibold">{t('settings.appearance')}</h2>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t('settings.theme')}</p>
          <div className="flex gap-2">
            {themes.map((opt) => (
              <Button
                key={opt.value}
                variant={theme === opt.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTheme(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{t('settings.language')}</p>
          <div className="flex gap-2">
            <Button variant={lang === 'he' ? 'default' : 'outline'} size="sm" onClick={() => setLang('he')}>
              עברית
            </Button>
            <Button variant={lang === 'en' ? 'default' : 'outline'} size="sm" onClick={() => setLang('en')}>
              English
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-semibold">{t('settings.account')}</h2>
        <p className={cn('text-sm text-muted-foreground')}>{t('settings.accountHint')}</p>
      </section>

      <section className="space-y-2 rounded-lg border p-4">
        <h2 className="font-semibold">{t('settings.about')}</h2>
        <p className="text-sm text-muted-foreground">{t('settings.aboutText')}</p>
        <p className="text-sm text-muted-foreground">{t('app.name')}</p>
      </section>
    </div>
  )
}
