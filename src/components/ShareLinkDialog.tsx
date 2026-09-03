import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useI18n } from '@/i18n'
import { toastSuccess } from '@/lib/toastUndo'
import { useCreateShareLink, useRegenerateShareLink, useRevokeShareLink, useShareLinks } from '@/queries/shareLinks'

const STORAGE_KEY = 'adminSecret'

/**
 * Manage share links for one ensemble (ensembleId set) or for all ensembles (ensembleId undefined).
 */
export function ShareLinkDialog({
  open,
  onOpenChange,
  ensembleId,
  ensembleName,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  ensembleId?: string
  ensembleName?: string
}) {
  const { t } = useI18n()
  const [secretInput, setSecretInput] = useState('')
  const [remember, setRemember] = useState(false)
  const [secret, setSecret] = useState<string | null>(
    () => sessionStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(STORAGE_KEY),
  )

  const { data: links, error } = useShareLinks(secret)
  const createLink = useCreateShareLink(secret)
  const revokeLink = useRevokeShareLink(secret)
  const regenerateLink = useRegenerateShareLink(secret)

  useEffect(() => {
    if (error && (error as Error).message === 'unauthorized' && secret) {
      sessionStorage.removeItem(STORAGE_KEY)
      localStorage.removeItem(STORAGE_KEY)
      setSecret(null)
    }
  }, [error, secret])

  const scoped = (links ?? []).filter((l) =>
    ensembleId ? l.ensemble_id === ensembleId : l.scope === 'all',
  )

  function unlock() {
    if (!secretInput) return
    ;(remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, secretInput)
    setSecret(secretInput)
  }

  async function create() {
    try {
      const link = await createLink.mutateAsync(
        ensembleId
          ? { scope: 'single_ensemble', ensemble_id: ensembleId, label: ensembleName }
          : { scope: 'all' },
      )
      toastSuccess(t('toasts.shareLinkCreated'), {
        label: t('common.undo'),
        onUndo: async () => {
          try {
            await revokeLink.mutateAsync(link.id)
            toast.success(t('common.undone'))
          } catch {
            toast.error(t('errors.saveFailed'))
          }
        },
      })
    } catch {
      toast.error(t('errors.saveFailed'))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{ensembleName ? `${t('home.ensembleShare')} — ${ensembleName}` : t('home.shareAll')}</DialogTitle>
        </DialogHeader>

        {!secret ? (
          <div className="space-y-3">
            <Input
              type="password"
              placeholder={t('manage.adminSecret')}
              value={secretInput}
              onChange={(e) => setSecretInput(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              {t('manage.rememberSecret')}
            </label>
            <Button onClick={unlock}>{t('manage.unlock')}</Button>
          </div>
        ) : (
          <div className="space-y-3">
            <Button size="sm" onClick={create}>
              {t('manage.newShareLink')}
            </Button>

            <ul className="divide-y rounded-lg border">
              {scoped.map((l) => {
                const url = `${window.location.origin}/share/${l.token}`
                return (
                  <li key={l.id} className={`space-y-2 p-3 ${l.revoked ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-2">
                      <Badge variant={l.revoked ? 'outline' : 'secondary'}>
                        {l.revoked ? t('manage.revoked') : t('manage.active')}
                      </Badge>
                      <span className="truncate text-xs text-muted-foreground">{url}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigator.clipboard.writeText(url).then(() => toast.success(t('common.copied')))}
                      >
                        {t('manage.copyUrl')}
                      </Button>
                      {!l.revoked && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await regenerateLink.mutateAsync(l.id)
                                toastSuccess(t('toasts.shareLinkRegenerated'))
                              } catch {
                                toast.error(t('errors.saveFailed'))
                              }
                            }}
                          >
                            {t('manage.regenerate')}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={async () => {
                              try {
                                await revokeLink.mutateAsync(l.id)
                                toastSuccess(t('toasts.shareLinkRevoked'))
                              } catch {
                                toast.error(t('errors.saveFailed'))
                              }
                            }}
                          >
                            {t('manage.revoke')}
                          </Button>
                        </>
                      )}
                    </div>
                  </li>
                )
              })}
              {scoped.length === 0 && <li className="p-3 text-sm text-muted-foreground">—</li>}
            </ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
