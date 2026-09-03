import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Tables, TablesInsert, TablesUpdate } from '@/lib/database.types'

export type EnsembleWithWeekdays = Tables<'ensembles'> & { weekdays: number[] }

export function useEnsembles() {
  return useQuery({
    queryKey: ['ensembles'],
    queryFn: async (): Promise<EnsembleWithWeekdays[]> => {
      const { data, error } = await supabase
        .from('ensembles')
        .select('*, ensemble_weekdays(weekday)')
        .order('sort_order')
        .order('name')
      if (error) throw error
      return data.map((e) => ({
        ...e,
        weekdays: (e.ensemble_weekdays as { weekday: number }[]).map((w) => w.weekday).sort((a, b) => a - b),
      }))
    },
  })
}

export function useCreateEnsemble() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ values, weekdays }: { values: TablesInsert<'ensembles'>; weekdays: number[] }) => {
      const { data: created, error } = await supabase.from('ensembles').insert(values).select('*').single()
      if (error) throw error
      const { error: wErr } = await supabase
        .from('ensemble_weekdays')
        .insert(weekdays.map((weekday) => ({ ensemble_id: created.id, weekday })))
      if (wErr) throw wErr
      return created
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ensembles'] }),
  })
}

export function useUpdateEnsemble() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      values,
      weekdays,
    }: {
      id: string
      values: TablesUpdate<'ensembles'>
      weekdays?: number[]
    }) => {
      const { data, error } = await supabase.from('ensembles').update(values).eq('id', id).select('*').single()
      if (error) throw error
      if (weekdays) {
        const { error: wErr } = await supabase.rpc('set_ensemble_weekdays', {
          p_ensemble_id: id,
          p_weekdays: weekdays,
        })
        if (wErr) throw wErr
      }
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ensembles'] }),
  })
}

export function useDeleteEnsemble() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('ensembles').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ensembles'] })
      qc.invalidateQueries({ queryKey: ['sessions'] })
    },
  })
}

export function useBulkCreateRehearsals() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { ensembleId: string; from: string; to: string; weekdays: number[] }) => {
      const { data, error } = await supabase.rpc('bulk_create_rehearsals', {
        p_ensemble_id: input.ensembleId,
        p_from: input.from,
        p_to: input.to,
        p_weekdays: input.weekdays,
      })
      if (error) throw error
      return data as number
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sessions'] })
      qc.invalidateQueries({ queryKey: ['sessionDates'] })
    },
  })
}

/** Persist a manual card/row order (ids in the desired order). */
export function useReorderEnsembles() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (orderedIds: string[]) => {
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase.from('ensembles').update({ sort_order: i + 1 }).eq('id', orderedIds[i])
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ensembles'] }),
  })
}
