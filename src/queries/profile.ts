import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

export function useProfile() {
  const { user } = useAuth()
  return useQuery({
    queryKey: ['profile', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      if (error) throw error
      return data
    },
  })
}

export function useSetMarketingOptIn() {
  const { user } = useAuth()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (marketing_opt_in: boolean) => {
      const { error } = await supabase
        .from('profiles')
        .update({ marketing_opt_in, marketing_opt_in_at: new Date().toISOString() })
        .eq('id', user!.id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['profile', user?.id] }),
  })
}
