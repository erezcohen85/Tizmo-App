import { useState } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { OptionRow } from '@/components/OptionRow'
import { TermsSheet } from '@/components/TermsSheet'
import { Checkbox } from '@/components/ui/checkbox'
import { Logo } from '@/components/Logo'
import { useI18n } from '@/i18n'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { TERMS_VERSION } from '@/legal/content'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function mapAuthError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('invalid login credentials')) return 'auth.errors.invalidCredentials'
  if (m.includes('email not confirmed')) return 'auth.errors.emailNotConfirmed'
  if (m.includes('already registered') || m.includes('already exists')) return 'auth.errors.userExists'
  if (m.includes('password') && m.includes('least')) return 'auth.errors.weakPassword'
  if (m.includes('rate limit') || m.includes('too many')) return 'auth.errors.rateLimited'
  return 'auth.errors.generic'
}

function FieldInput({
  type = 'text',
  value,
  onChange,
  placeholder,
  showToggle,
}: {
  type?: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  showToggle?: boolean
}) {
  const [visible, setVisible] = useState(false)
  const resolvedType = showToggle ? (visible ? 'text' : 'password') : type

  return (
    <div className="relative flex h-11 items-center shadow-[0_1px_0_0_hsl(var(--hairline)/var(--hairline-a))] focus-within:shadow-[0_1px_0_0_hsl(var(--lamp))]">
      <input
        type={resolvedType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="autofill-bare h-full w-full bg-transparent font-ui text-[15px] font-light text-score placeholder:text-faint focus:outline-none"
      />
      {showToggle && (
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="flex h-11 w-11 shrink-0 items-center justify-center text-faint hover:text-dim"
        >
          {visible ? <EyeOff className="size-[17px]" strokeWidth={1.4} /> : <Eye className="size-[17px]" strokeWidth={1.4} />}
        </button>
      )}
    </div>
  )
}

export default function AuthPage() {
  const { t, lang, setLang } = useI18n()
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const initialMode = params.get('mode') === 'signup' ? 'signup' : 'signin'

  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [marketing, setMarketing] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [forgotSent, setForgotSent] = useState(false)
  const [verifySent, setVerifySent] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/" replace />

  const emailValid = EMAIL_RE.test(email)
  const passwordValid = password.length >= 8
  const canSubmit =
    mode === 'signin'
      ? emailValid && password.length > 0
      : emailValid && passwordValid && confirmPassword === password && agreed

  async function submit() {
    if (!canSubmit || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      if (mode === 'signin') {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setError(mapAuthError(signInError.message))
          return
        }
        navigate('/', { replace: true })
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { terms_version: TERMS_VERSION, marketing_opt_in: marketing },
          },
        })
        if (signUpError) {
          setError(mapAuthError(signUpError.message))
          return
        }
        setVerifySent(email)
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function sendReset() {
    if (!emailValid || submitting) return
    setSubmitting(true)
    setError(null)
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/reset`,
      })
      if (resetError) {
        setError(mapAuthError(resetError.message))
        return
      }
      setForgotSent(true)
    } finally {
      setSubmitting(false)
    }
  }

  async function resend() {
    if (!verifySent) return
    await supabase.auth.resend({ type: 'signup', email: verifySent })
  }

  if (verifySent) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-stage px-5 text-center">
        <Logo className="h-11 w-auto" title={t('app.name')} />
        <p className="mt-8 text-[15px] font-light text-dim">{t('auth.verifySent')}</p>
        <p className="mt-1 text-[15.5px] text-score">{verifySent}</p>
        <button type="button" onClick={resend} className="mt-8 font-ui text-[12.5px] font-light text-dim hover:text-lamp">
          {t('auth.resend')}
        </button>
      </div>
    )
  }

  if (forgotOpen) {
    return (
      <div className="flex min-h-dvh flex-col items-center bg-stage px-5 pt-[18vh]">
        <div className="w-full max-w-[340px] space-y-8">
          <div className="flex flex-col items-center">
            <Logo className="h-11 w-auto" title={t('app.name')} />
          </div>

          {forgotSent ? (
            <p className="text-center text-[15px] font-light text-dim">{t('auth.resetSent')}</p>
          ) : (
            <div className="space-y-5">
              <FieldInput value={email} onChange={setEmail} placeholder={t('auth.email')} type="email" />
              {error && <p className="font-alt text-[11.5px] text-status-absent">{t(error as never)}</p>}
              <button
                type="button"
                disabled={!emailValid || submitting}
                onClick={sendReset}
                className="h-11 w-full border border-hairline font-ui text-[13px] font-light text-score transition-colors hover:text-lamp disabled:opacity-40"
              >
                {submitting ? '…' : t('auth.sendReset')}
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              setForgotOpen(false)
              setForgotSent(false)
              setError(null)
            }}
            className="mx-auto block font-ui text-[12.5px] font-light text-dim hover:text-lamp"
          >
            {t('auth.signIn')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh flex-col items-center bg-stage px-5 pt-[14vh]">
      <div className="w-full max-w-[340px] space-y-8">
        <div className="flex flex-col items-center gap-2">
          <Logo className="h-11 w-auto" title={t('app.name')} />
          <p className="font-alt text-[11.5px] tracking-[.18em] text-faint">{t('auth.tagline')}</p>
        </div>

        <div className="flex justify-center">
          <OptionRow
            options={[
              { value: 'signin' as const, label: t('auth.signIn') },
              { value: 'signup' as const, label: t('auth.signUp') },
            ]}
            value={mode}
            onChange={(v) => {
              setMode(v)
              setError(null)
            }}
          />
        </div>

        <div className="space-y-5">
          <FieldInput value={email} onChange={setEmail} placeholder={t('auth.email')} type="email" />
          <FieldInput value={password} onChange={setPassword} placeholder={t('auth.password')} showToggle />
          {mode === 'signup' && (
            <FieldInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder={t('auth.confirmPassword')}
              showToggle
            />
          )}

          {mode === 'signup' && (
            <div className="space-y-3">
              <label className="flex items-start gap-2.5">
                <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} className="mt-0.5" />
                <span className="text-[13px] text-dim">
                  {t('auth.agreeTo')}{' '}
                  <button type="button" onClick={() => setTermsOpen(true)} className="text-score underline underline-offset-2">
                    {t('auth.termsLink')}
                  </button>
                </span>
              </label>
              <label className="flex items-start gap-2.5">
                <Checkbox checked={marketing} onCheckedChange={(v) => setMarketing(v === true)} className="mt-0.5" />
                <span className="text-[13px] text-dim">{t('auth.newsletter')}</span>
              </label>
            </div>
          )}

          {mode === 'signin' && (
            <button
              type="button"
              onClick={() => {
                setForgotOpen(true)
                setError(null)
              }}
              className="font-ui text-[12.5px] font-light text-dim hover:text-lamp"
            >
              {t('auth.forgot')}
            </button>
          )}

          {error && <p className="font-alt text-[11.5px] text-status-absent">{t(error as never)}</p>}

          <button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={submit}
            className={cn(
              'h-11 w-full border border-hairline font-ui text-[13px] font-light text-score transition-colors hover:text-lamp disabled:opacity-40',
            )}
          >
            {submitting ? '…' : mode === 'signin' ? t('auth.signIn') : t('auth.signUp')}
          </button>
        </div>

        <div className="flex justify-center">
          <OptionRow
            options={[
              { value: 'he' as const, label: 'עברית' },
              { value: 'en' as const, label: 'English' },
            ]}
            value={lang}
            onChange={setLang}
          />
        </div>
      </div>

      <TermsSheet open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  )
}
