import { useState } from 'react'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { OptionRow } from '@/components/OptionRow'
import { TermsSheet } from '@/components/TermsSheet'
import { ManageShareLinksDialog } from '@/components/ManageShareLinksDialog'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { useTheme, type Theme } from '@/lib/theme'
import { useFontSize, type FontSize } from '@/lib/fontSize'
import { callDeleteAccount } from '@/lib/functions'
import { useProfile, useSetMarketingOptIn } from '@/queries/profile'

export default function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { theme, setTheme } = useTheme()
  const { fontSize, setFontSize } = useFontSize()
  const { user } = useAuth()
  const navigate = useNavigate()
  const { data: profile } = useProfile()
  const setMarketingOptIn = useSetMarketingOptIn()
  const [termsOpen, setTermsOpen] = useState(false)
  const [shareLinksOpen, setShareLinksOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [deleting, setDeleting] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/auth', { replace: true })
  }

  async function deleteAccount() {
    setDeleting(true)
    try {
      const res = await callDeleteAccount()
      if (!res.ok) {
        toast.error(t('errors.saveFailed'))
        return
      }
      await supabase.auth.signOut()
      navigate('/auth', { replace: true })
    } finally {
      setDeleting(false)
    }
  }

  const themes: { value: Theme; label: string }[] = [
    { value: 'system', label: t('settings.themeSystem') },
    { value: 'light', label: t('settings.themeLight') },
    { value: 'dark', label: t('settings.themeDark') },
  ]

  const fontSizes: { value: FontSize; label: string }[] = [
    { value: 'small', label: t('settings.fontSizeSmall') },
    { value: 'medium', label: t('settings.fontSizeMedium') },
    { value: 'large', label: t('settings.fontSizeLarge') },
    { value: 'xlarge', label: t('settings.fontSizeXLarge') },
  ]

  return (
    <div className="mx-auto max-w-2xl space-y-11">
      <section className="space-y-6">
        <div className="space-y-2">
          <p className="text-[12px] text-faint">{t('settings.theme')}</p>
          <OptionRow options={themes} value={theme} onChange={setTheme} />
        </div>

        <div className="space-y-2">
          <p className="text-[12px] text-faint">{t('settings.fontSize')}</p>
          <OptionRow options={fontSizes} value={fontSize} onChange={setFontSize} />
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

      <section className="space-y-4 shadow-separator pt-6">
        <p className="font-alt text-[11.5px] tracking-[.18em] text-faint">{t('settings.account').toUpperCase()}</p>
        <p className="font-ui text-[15.5px] font-normal text-score">{user?.email}</p>

        <label className="flex items-start gap-2.5">
          <Checkbox
            checked={profile?.marketing_opt_in ?? false}
            onCheckedChange={(v) => setMarketingOptIn.mutate(v === true)}
            className="mt-0.5"
          />
          <span className="font-ui text-[13px] font-light text-dim">{t('settings.newsletterOptIn')}</span>
        </label>

        <button
          type="button"
          onClick={() => setShareLinksOpen(true)}
          className="block font-ui text-[12.5px] font-light text-dim transition-colors hover:text-lamp"
        >
          {t('manage.myShareLinks')}
        </button>

        <button
          type="button"
          onClick={() => setTermsOpen(true)}
          className="block font-ui text-[12.5px] font-light text-dim transition-colors hover:text-lamp"
        >
          {t('settings.viewTerms')}
        </button>

        <button
          type="button"
          onClick={signOut}
          className="block font-ui text-[12.5px] font-light text-dim transition-colors hover:text-lamp"
        >
          {t('settings.signOut')}
        </button>
      </section>

      <section className="space-y-2 shadow-separator pt-6">
        <p className="font-alt text-[11.5px] tracking-[.18em] text-faint">{t('settings.about').toUpperCase()}</p>
        <p className="font-ui text-[13px] font-light text-dim">{t('settings.aboutText')}</p>
        <p className="font-ui text-[13px] font-light text-dim">{t('app.name')}</p>
        <a
          href="mailto:tizmo.app@gmail.com"
          className="block font-ui text-[12.5px] font-light text-dim transition-colors hover:text-lamp"
        >
          {t('settings.contactUs')}
        </a>
      </section>

      <section className="space-y-3 shadow-separator pt-6">
        <p className="font-alt text-[11.5px] tracking-[.18em] text-status-absent">{t('settings.dangerZone').toUpperCase()}</p>
        <p className="font-ui text-[13px] font-light text-dim">{t('settings.deleteAccountHint')}</p>
        <button
          type="button"
          onClick={() => setDeleteOpen(true)}
          className="border border-status-absent px-4 py-2 font-ui text-[12.5px] font-light text-status-absent transition-colors hover:bg-status-absent/10"
        >
          {t('settings.deleteAccount')}
        </button>
      </section>

      <TermsSheet open={termsOpen} onOpenChange={setTermsOpen} />

      <ManageShareLinksDialog open={shareLinksOpen} onOpenChange={setShareLinksOpen} />

      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setConfirmEmail('') }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-alt text-[11.5px] font-normal tracking-[.18em] text-status-absent">
              {t('settings.deleteAccount').toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="font-ui text-[13px] font-light text-dim">{t('settings.deleteAccountConfirm')}</p>
            <p className="font-ui text-[12px] font-light text-faint">{t('settings.deleteAccountType')}</p>
            <Input value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)} placeholder={user?.email ?? ''} />
            <button
              type="button"
              disabled={confirmEmail.trim().toLowerCase() !== (user?.email ?? '').toLowerCase() || deleting}
              onClick={deleteAccount}
              className="w-full border border-status-absent py-2.5 font-ui text-[13px] font-light text-status-absent transition-opacity disabled:opacity-40"
            >
              {deleting ? '…' : t('settings.deleteAccountConfirmButton')}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
