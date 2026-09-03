import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/lib/database.types'

type AttendanceStatus = Database['public']['Enums']['attendance_status']

export function useAttendance(sessionId: string | undefined) {
  return useQuery({
    queryKey: ['attendance', sessionId],
    enabled: !!sessionId,
    queryFn: async () => {
      const { data, error } = await supabase.from('attendance').select('*').eq('session_id', sessionId as string)
      if (error) throw error
      return data
    },
  })
}

export function useAttendanceForSessions(sessionIds: string[]) {
  return useQuery({
    queryKey: ['attendance', 'bulk', sessionIds],
    enabled: sessionIds.length > 0,
    queryFn: async () => {
      const chunks: string[][] = []
      for (let i = 0; i < sessionIds.length; i += 200) chunks.push(sessionIds.slice(i, i + 200))
      const results = await Promise.all(
        chunks.map(async (ids) => {
          const { data, error } = await supabase.from('attendance').select('*').in('session_id', ids)
          if (error) throw error
          return data
        }),
      )
      return results.flat()
    },
  })
}

export function useSetAttendanceStatus(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, status }: { studentId: string; status: AttendanceStatus | null }) => {
      if (status === null) {
        const { error } = await supabase
          .from('attendance')
          .delete()
          .eq('session_id', sessionId)
          .eq('student_id', studentId)
        if (error) throw error
        return null
      }
      const { data, error } = await supabase
        .from('attendance')
        .upsert({ session_id: sessionId, student_id: studentId, status }, { onConflict: 'session_id,student_id' })
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onMutate: async ({ studentId, status }) => {
      await qc.cancelQueries({ queryKey: ['attendance', sessionId] })
      const prev = qc.getQueryData<{ session_id: string; student_id: string; status: string; note: string | null }[]>([
        'attendance',
        sessionId,
      ])
      qc.setQueryData(['attendance', sessionId], (old: typeof prev = []) => {
        const rest = (old ?? []).filter((a) => a.student_id !== studentId)
        if (status === null) return rest
        const existing = (old ?? []).find((a) => a.student_id === studentId)
        return [...rest, { session_id: sessionId, student_id: studentId, status, note: existing?.note ?? null }]
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(['attendance', sessionId], ctx.prev)
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['attendance', sessionId] }),
  })
}

export function useSetAttendanceNote(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ studentId, note }: { studentId: string; note: string }) => {
      const { data, error } = await supabase
        .from('attendance')
        .update({ note })
        .eq('session_id', sessionId)
        .eq('student_id', studentId)
        .select('*')
        .single()
      if (error) throw error
      return data
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['attendance', sessionId] }),
  })
}

export function useMarkAllPresent(sessionId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (studentIds: string[]) => {
      const { data: existing, error: exErr } = await supabase
        .from('attendance')
        .select('student_id')
        .eq('session_id', sessionId)
      if (exErr) throw exErr
      const already = new Set((existing ?? []).map((a) => a.student_id))
      const toInsert = studentIds.filter((id) => !already.has(id))
      if (!toInsert.length) return
      const { error } = await supabase
        .from('attendance')
        .insert(toInsert.map((student_id) => ({ session_id: sessionId, student_id, status: 'present' as const })))
      if (error) throw error
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['attendance', sessionId] }),
  })
}
