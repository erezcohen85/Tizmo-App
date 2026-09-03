import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { TablesInsert, TablesUpdate } from '@/lib/database.types'

export function useStudents() {
  return useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      const { data, error } = await supabase.from('students').select('*').order('last_name').order('first_name')
      if (error) throw error
      return data
    },
  })
}

export function useMemberships() {
  return useQuery({
    queryKey: ['memberships'],
    queryFn: async () => {
      const { data, error } = await supabase.from('student_ensembles').select('*')
      if (error) throw error
      return data
    },
  })
}

export type MembershipInput = { ensemble_id: string; joined_on: string; terminated_on: string | null }

export function useCreateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      student,
      memberships,
    }: {
      student: TablesInsert<'students'>
      memberships: MembershipInput[]
    }) => {
      const { data: created, error } = await supabase.from('students').insert(student).select('*').single()
      if (error) throw error
      if (memberships.length) {
        const { error: mErr } = await supabase
          .from('student_ensembles')
          .insert(memberships.map((m) => ({ ...m, student_id: created.id })))
        if (mErr) throw mErr
      }
      return created
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

export function useUpdateStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      student,
      memberships,
      originalEnsembleIds,
    }: {
      id: string
      student: TablesUpdate<'students'>
      memberships: MembershipInput[]
      originalEnsembleIds: string[]
    }) => {
      const { error } = await supabase.from('students').update(student).eq('id', id)
      if (error) throw error

      const nextIds = memberships.map((m) => m.ensemble_id)
      const toDelete = originalEnsembleIds.filter((eid) => !nextIds.includes(eid))
      if (toDelete.length) {
        const { error: delErr } = await supabase
          .from('student_ensembles')
          .delete()
          .eq('student_id', id)
          .in('ensemble_id', toDelete)
        if (delErr) throw delErr
      }

      for (const m of memberships) {
        const { error: upErr } = await supabase
          .from('student_ensembles')
          .upsert({ student_id: id, ...m }, { onConflict: 'student_id,ensemble_id' })
        if (upErr) throw upErr
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

export function useDeleteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('students').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

export function useImportStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      ensembleId,
      joinedOn,
      rows,
    }: {
      ensembleId: string
      joinedOn: string
      rows: { first_name: string; last_name: string; instrument: string; grade: string }[]
    }) => {
      const { data, error } = await supabase.rpc('import_students', {
        p_ensemble_id: ensembleId,
        p_joined_on: joinedOn,
        p_rows: rows,
      })
      if (error) throw error
      return data as {
        inserted: number
        linked: number
        skipped: number
        invalid: number
        inserted_ids: string[]
        linked_ids: string[]
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['memberships'] })
    },
  })
}

/** Add an existing student to an ensemble (or revive a terminated membership). */
export function useAddMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      studentId,
      ensembleId,
      joinedOn,
    }: {
      studentId: string
      ensembleId: string
      joinedOn: string
    }) => {
      const { error } = await supabase
        .from('student_ensembles')
        .upsert(
          { student_id: studentId, ensemble_id: ensembleId, joined_on: joinedOn, terminated_on: null },
          { onConflict: 'student_id,ensemble_id' },
        )
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}

/** End a membership as of a date, keeping all past attendance and stats. */
export function useEndMembership() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, ensembleId, on }: { studentId: string; ensembleId: string; on: string }) => {
      const { error } = await supabase
        .from('student_ensembles')
        .update({ terminated_on: on })
        .eq('student_id', studentId)
        .eq('ensemble_id', ensembleId)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['memberships'] }),
  })
}

/** Remove a membership entirely and delete that student's attendance for the ensemble's sessions. */
export function useDeleteMembershipForever() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, ensembleId }: { studentId: string; ensembleId: string }) => {
      const { data: links, error: linkErr } = await supabase
        .from('session_ensembles')
        .select('session_id')
        .eq('ensemble_id', ensembleId)
      if (linkErr) throw linkErr

      const sessionIds = (links ?? []).map((l) => l.session_id)
      for (let i = 0; i < sessionIds.length; i += 200) {
        const chunk = sessionIds.slice(i, i + 200)
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('student_id', studentId)
          .in('session_id', chunk)
        if (error) throw error
      }

      const { error } = await supabase
        .from('student_ensembles')
        .delete()
        .eq('student_id', studentId)
        .eq('ensemble_id', ensembleId)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['memberships'] })
      qc.invalidateQueries({ queryKey: ['attendance'] })
    },
  })
}
