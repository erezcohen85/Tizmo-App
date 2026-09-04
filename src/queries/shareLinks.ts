import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { ShareLink } from '@/lib/functions'

export function useShareLinks() {
  return useQuery({
    queryKey: ['shareLinks'],
    queryFn: async () => {
      const { data, error } = await supabase.from('share_links').select('*').order('created_at', { ascending: false })
      if (error) throw error
      return data as ShareLink[]
    },
  })
}

export function useCreateShareLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { scope: 'all' | 'single_ensemble'; ensemble_id?: string; label?: string }) => {
      const { data, error } = await supabase
        .from('share_links')
        .insert({ scope: input.scope, ensemble_id: input.ensemble_id ?? null, label: input.label ?? null })
        .select('*')
        .single()
      if (error) throw error
      return data as ShareLink
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareLinks'] }),
  })
}

export function useRevokeShareLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('share_links').update({ revoked: true }).eq('id', id).select('*').single()
      if (error) throw error
      return data as ShareLink
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareLinks'] }),
  })
}

export function useRegenerateShareLink() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { data: old, error: oldError } = await supabase
        .from('share_links')
        .update({ revoked: true })
        .eq('id', id)
        .select('*')
        .single()
      if (oldError) throw oldError

      const { data: created, error: createError } = await supabase
        .from('share_links')
        .insert({ scope: old.scope, ensemble_id: old.ensemble_id, label: old.label })
        .select('*')
        .single()
      if (createError) throw createError
      return created as ShareLink
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['shareLinks'] }),
  })
}
