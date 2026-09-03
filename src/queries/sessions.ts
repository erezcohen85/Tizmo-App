import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database, TablesUpdate } from '@/lib/database.types'

type SessionKind = Database['public']['Enums']['session_kind']

export function useSessionsInRange(from: string, to: string, ensembleId?: string) {
  return useQuery({
    queryKey: ['sessions', { from, to, ensembleId }],
    queryFn: async () => {
      let query = supabase
        .from('sessions')
        .select('*, session_ensembles(ensemble_id)')
        .gte('date', from)
        .lte('date', to)
        .order('date', { ascending: false })

      const { data, error } = await query
      if (error) throw error
      const rows = data.map((s) => ({
        ...s,
        ensemble_ids: (s.session_ensembles as { ensemble_id: string }[]).map((e) => e.ensemble_id),
      }))
      return ensembleId ? rows.filter((r) => r.ensemble_ids.includes(ensembleId)) : rows
    },
  })
}

/** All distinct dates that already have a rehearsal or event for this ensemble, ascending. Used for date-nav skip. */
export function useSessionDatesForEnsemble(ensembleId: string | undefined) {
  return useQuery({
    queryKey: ['sessionDates', ensembleId],
    enabled: !!ensembleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('session_ensembles')
        .select('session_date')
        .eq('ensemble_id', ensembleId as string)
        .order('session_date', { ascending: true })
      if (error) throw error
      return [...new Set(data.map((r) => r.session_date))]
    },
  })
}

export function useSessionsForEnsembleOnDate(ensembleId: string | undefined, date: string) {
  return useQuery({
    queryKey: ['sessions', 'byDate', ensembleId, date],
    enabled: !!ensembleId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('sessions')
        .select('*, session_ensembles!inner(ensemble_id)')
        .eq('date', date)
        .eq('session_ensembles.ensemble_id', ensembleId as string)
      if (error) throw error
      return data
    },
  })
}

export function useSessionRoster(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['roster', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('session_roster', { p_session_id: sessionId as string })
      if (error) throw error
      return data
    },
  })
}

export function useGetOrCreateRehearsal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ ensembleId, date }: { ensembleId: string; date: string }) => {
      const { data, error } = await supabase.rpc('get_or_create_rehearsal', {
        p_ensemble_id: ensembleId,
        p_date: date,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessionDates'] })
    },
  })
}

export function useCreateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      date: string
      kind: SessionKind
      title: string | null
      start_time: string | null
      ensemble_ids: string[]
    }) => {
      const { data, error } = await supabase.rpc('create_session', {
        p_date: input.date,
        p_kind: input.kind,
        p_title: input.title,
        p_start_time: input.start_time,
        p_ensemble_ids: input.ensemble_ids,
      })
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessionDates'] })
    },
  })
}

export function useUpdateSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, values }: { id: string; values: TablesUpdate<'sessions'> }) => {
      const { data, error } = await supabase.from('sessions').update(values).eq('id', id).select('*').single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessionDates'] })
    },
  })
}

export function useSetSessionEnsembles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ sessionId, ensembleIds }: { sessionId: string; ensembleIds: string[] }) => {
      const { error } = await supabase.rpc('set_session_ensembles', {
        p_session_id: sessionId,
        p_ensemble_ids: ensembleIds,
      })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessionDates'] })
    },
  })
}

export function useDeleteSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('sessions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessionDates'] })
    },
  })
}
