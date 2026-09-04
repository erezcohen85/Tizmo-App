import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'GET') return json({ error: 'method_not_allowed' }, 405)

  const url = new URL(req.url)
  const token = url.searchParams.get('token')
  const ensembleParam = url.searchParams.get('ensemble')
  const kindParam = url.searchParams.get('kind')
  const from = url.searchParams.get('from')
  const to = url.searchParams.get('to')

  if (!token) return json({ error: 'token_required' }, 400)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { data: link, error: linkError } = await supabase
    .from('share_links')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (linkError || !link) return json({ error: 'invalid_token' }, 404)
  if (link.revoked) return json({ error: 'revoked' }, 410)

  const ensembleFilter = link.scope === 'single_ensemble' ? link.ensemble_id : ensembleParam

  const { data: ensembles } = await supabase.from('ensembles').select('id, name').eq('owner_id', link.owner_id)

  let sessionQuery = supabase
    .from('sessions')
    .select('id, date, start_time, kind, title, status, cancel_reason, session_ensembles!inner(ensemble_id)')
    .eq('owner_id', link.owner_id)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1001)

  if (ensembleFilter) sessionQuery = sessionQuery.eq('session_ensembles.ensemble_id', ensembleFilter)
  if (kindParam) sessionQuery = sessionQuery.eq('kind', kindParam)
  if (from) sessionQuery = sessionQuery.gte('date', from)
  if (to) sessionQuery = sessionQuery.lte('date', to)

  const { data: sessionRows, error: sessionsError } = await sessionQuery
  if (sessionsError) return json({ error: 'query_failed', detail: sessionsError.message }, 500)

  const truncated = (sessionRows?.length ?? 0) > 1000
  const sessions = (sessionRows ?? []).slice(0, 1000)
  const sessionIds = sessions.map((s) => s.id)

  // full ensemble linkage per session (the !inner filter above may have hidden other links)
  const { data: allLinks } = sessionIds.length
    ? await supabase.from('session_ensembles').select('session_id, ensemble_id').in('session_id', sessionIds)
    : { data: [] as { session_id: string; ensemble_id: string }[] }

  const linksBySession = new Map<string, string[]>()
  for (const l of allLinks ?? []) {
    const arr = linksBySession.get(l.session_id) ?? []
    arr.push(l.ensemble_id)
    linksBySession.set(l.session_id, arr)
  }

  const rosterCache = new Map<string, string[]>()
  const studentIds = new Set<string>()

  for (const s of sessions) {
    const { data: roster } = await supabase.rpc('session_roster', { p_session_id: s.id })
    const ids = (roster ?? []).map((r: { id: string }) => r.id)
    rosterCache.set(s.id, ids)
    ids.forEach((id: string) => studentIds.add(id))
  }

  const { data: attendanceRows } = sessionIds.length
    ? await supabase.from('attendance').select('session_id, student_id, status').in('session_id', sessionIds)
    : { data: [] as { session_id: string; student_id: string; status: string }[] }

  ;(attendanceRows ?? []).forEach((a) => studentIds.add(a.student_id))

  const { data: studentRows } = studentIds.size
    ? await supabase
        .from('students')
        .select('id, first_name, last_name, instrument, grade')
        .eq('owner_id', link.owner_id)
        .in('id', [...studentIds])
    : { data: [] as { id: string; first_name: string; last_name: string; instrument: string | null; grade: string | null }[] }

  const attendanceBySession = new Map<string, { student_id: string; status: string }[]>()
  for (const a of attendanceRows ?? []) {
    const arr = attendanceBySession.get(a.session_id) ?? []
    arr.push({ student_id: a.student_id, status: a.status })
    attendanceBySession.set(a.session_id, arr)
  }

  const response = {
    scope: link.scope,
    ensembles: (ensembles ?? []).filter((e) => !ensembleFilter || e.id === ensembleFilter),
    students: studentRows ?? [],
    sessions: sessions.map((s) => ({
      id: s.id,
      date: s.date,
      start_time: s.start_time,
      kind: s.kind,
      title: s.title,
      status: s.status,
      cancel_reason: s.cancel_reason,
      ensemble_ids: linksBySession.get(s.id) ?? [],
      roster_student_ids: rosterCache.get(s.id) ?? [],
      attendance: attendanceBySession.get(s.id) ?? [],
    })),
    truncated,
  }

  return json(response, 200)
})
