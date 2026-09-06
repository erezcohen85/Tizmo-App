import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EnsembleDot } from '@/components/EnsembleDot'
import { ShareLinkLabelEditor } from '@/components/ShareLinkDialog'
import { useI18n } from '@/i18n'
import { toastSuccess } from '@/lib/toastUndo'
import { useEnsembles } from '@/queries/ensembles'
import { useDeleteShareLink, useRegenerateShareLink, useRevokeShareLink, useShareLinks } from '@/queries/shareLinks'

/**
 * Every share link the teacher has ever created, across every ensemble and the "all
 * ensembles" scope — one place to see what's out there and cut it off.
 */
export function ManageShareLinksDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useI18n()
  const { data: links } = useShareLinks()
  const { data: ensembles } = useEnsembles()
  const revokeLink = useRevokeShareLink()
  const regenerateLink = useRegenerateShareLink()
  const deleteLink = useDeleteShareLink()

  const sorted = [...(links ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-alt text-[11.5px] font-normal tracking-[.18em] text-faint">
            {t('manage.myShareLinks').toUpperCase()}
          </DialogTitle>
        </DialogHeader>

        <ul className="max-h-[60vh] overflow-y-auto">
          {sorted.map((l) => {
            const ensemble = l.ensemble_id ? ensembles?.find((e) => e.id === l.ensemble_id) : undefined
            const scopeLabel = l.scope === 'all' ? t('manage.allEnsembles') : ensemble?.name ?? t('manage.noEnsemble')
            const url = `${window.location.origin}/share/${l.token}`
            const created = new Date(l.created_at).toLocaleDateString()
            return (
              <li key={l.id} className={`space-y-2 py-3 shadow-separator ${l.revoked ? 'opacity-50' : ''}`}>
                <div className="flex items-center gap-2">
                  {ensemble && <EnsembleDot color={ensemble.color} />}
                  <span className="text-[13.5px] font-normal text-score">{scopeLabel}</span>
                  <span
                    className={`font-alt text-[11.5px] tracking-[.14em] ${l.revoked ? 'text-faint' : 'text-status-present'}`}
                  >
                    {l.revoked ? t('manage.revoked') : t('manage.active')}
                  </span>
                  <span className="ms-auto text-[11.5px] text-faint">{created}</span>
                </div>
                <p className="truncate text-[11.5px] text-faint">{url}</p>
                <ShareLinkLabelEditor link={l} />
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
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-status-absent hover:text-status-absent"
                    onClick={async () => {
                      if (!confirm(t('manage.deleteShareLinkConfirm'))) return
                      try {
                        await deleteLink.mutateAsync(l.id)
                        toastSuccess(t('toasts.shareLinkDeleted'))
                      } catch {
                        toast.error(t('errors.saveFailed'))
                      }
                    }}
                  >
                    {t('common.delete')}
                  </Button>
                </div>
              </li>
            )
          })}
          {sorted.length === 0 && <li className="p-3 text-sm text-muted-foreground">—</li>}
        </ul>
      </DialogContent>
    </Dialog>
  )
}
