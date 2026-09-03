import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { callManageShareLink } from '@/lib/functions'

export function useShareLinks(secret: string | null) {
  return useQuery({
    queryKey: ['shareLinks'],
    enabled: !!secret,
    queryFn: async () => {
      const res = await callManageShareLink(secret as string, { action: 'list' })
      if (!res.ok) throw new Error(res.error)
      return res.data.links ?? []
    },
  })
}

export function useCreateShareLink(secret: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { scope: 'all' | 'single_ensemble'; ensemble_id?: string; label?: string }) => {
      const res = await callManageShareLink(secret as string, { action: 'create', ...input })
      if (!res.ok) throw new Error(res.error)
      return res.data.link!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareLinks'] }),
  })
}

export function useRevokeShareLink(secret: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callManageShareLink(secret as string, { action: 'revoke', id })
      if (!res.ok) throw new Error(res.error)
      return res.data.link!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareLinks'] }),
  })
}

export function useRegenerateShareLink(secret: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await callManageShareLink(secret as string, { action: 'regenerate', id })
      if (!res.ok) throw new Error(res.error)
      return res.data.link!
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareLinks'] }),
  })
}
