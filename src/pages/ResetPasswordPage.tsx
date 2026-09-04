import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { useI18n } from '@/i18n'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [visible, setVisible] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  const valid = password.length >= 8 && password === confirmPassword

  async function submit() {
    if (!valid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) {
        setError(t('auth.errors.generic'))
        return
      }
      setDone(true)
      setTimeout(() => navigate('/', { replace: true }), 1500)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-stage px-5 pt-[18vh]">
      <div className="w-full max-w-[340px] space-y-8">
        <div className="flex flex-col items-center">
          <Logo className="h-11 w-auto" title={t('app.name')} />
        </div>

        {done ? (
          <p className="text-center text-[15px] font-light text-dim">{t('auth.resetDone')}</p>
        ) : (
          <div className="space-y-5">
            <p className="text-center text-[15px] font-light text-dim">{t('auth.newPassword')}</p>
            <div className="relative flex h-11 items-center shadow-[0_1px_0_0_hsl(var(--hairline)/var(--hairline-a))] focus-within:shadow-[0_1px_0_0_hsl(var(--lamp))]">
              <input
                type={visible ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.password')}
                className="autofill-bare h-full w-full bg-transparent font-ui text-[15px] font-light text-score placeholder:text-faint focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setVisible((v) => !v)}
                className="flex h-11 w-11 shrink-0 items-center justify-center text-faint hover:text-dim"
              >
                {visible ? <EyeOff className="size-[17px]" strokeWidth={1.4} /> : <Eye className="size-[17px]" strokeWidth={1.4} />}
              </button>
            </div>
            <div className="flex h-11 items-center shadow-[0_1px_0_0_hsl(var(--hairline)/var(--hairline-a))] focus-within:shadow-[0_1px_0_0_hsl(var(--lamp))]">
              <input
                type={visible ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.confirmPassword')}
                className="autofill-bare h-full w-full bg-transparent font-ui text-[15px] font-light text-score placeholder:text-faint focus:outline-none"
              />
            </div>

            {error && <p className="font-alt text-[11.5px] text-status-absent">{error}</p>}

            <button
              type="button"
              disabled={!valid || submitting}
              onClick={submit}
              className="h-11 w-full border border-hairline font-ui text-[13px] font-light text-score transition-colors hover:text-lamp disabled:opacity-40"
            >
              {submitting ? '…' : t('common.save')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
