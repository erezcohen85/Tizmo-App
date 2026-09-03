import { FUNCTIONS_URL } from './supabase'

const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export type ShareHistorySession = {
  id: string
  date: string
  start_time: string | null
  kind: string
  title: string | null
  status: 'scheduled' | 'held' | 'canceled'
  cancel_reason: string | null
  ensemble_ids: string[]
  roster_student_ids: string[]
  attendance: { student_id: string; status: string }[]
}

export type ShareHistoryResponse = {
  scope: 'all' | 'single_ensemble'
  ensembles: { id: string; name: string }[]
  students: { id: string; first_name: string; last_name: string; instrument: string | null; grade: string | null }[]
  sessions: ShareHistorySession[]
  truncated: boolean
}

export type ShareHistoryError = { error: string }

export async function callShareHistory(params: {
  token: string
  ensemble?: string
  kind?: string
  from?: string
  to?: string
}): Promise<{ ok: true; data: ShareHistoryResponse } | { ok: false; status: number; error: string }> {
  const url = new URL(`${FUNCTIONS_URL}/share-history`)
  url.searchParams.set('token', params.token)
  if (params.ensemble) url.searchParams.set('ensemble', params.ensemble)
  if (params.kind) url.searchParams.set('kind', params.kind)
  if (params.from) url.searchParams.set('from', params.from)
  if (params.to) url.searchParams.set('to', params.to)

  const res = await fetch(url.toString(), {
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
  })
  const body = await res.json()
  if (!res.ok) return { ok: false, status: res.status, error: (body as ShareHistoryError).error ?? 'error' }
  return { ok: true, data: body as ShareHistoryResponse }
}

export type ShareLink = {
  id: string
  token: string
  scope: 'all' | 'single_ensemble'
  ensemble_id: string | null
  label: string | null
  revoked: boolean
  created_at: string
}

export async function callManageShareLink(
  secret: string,
  body: { action: 'list' } | { action: 'create'; scope: 'all' | 'single_ensemble'; ensemble_id?: string; label?: string } | { action: 'revoke'; id: string } | { action: 'regenerate'; id: string },
): Promise<{ ok: true; data: { links?: ShareLink[]; link?: ShareLink } } | { ok: false; status: number; error: string }> {
  const res = await fetch(`${FUNCTIONS_URL}/manage-share-link`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
      Authorization: `Bearer ${ANON_KEY}`,
      'x-admin-secret': secret,
    },
    body: JSON.stringify(body),
  })
  const responseBody = await res.json()
  if (!res.ok) return { ok: false, status: res.status, error: (responseBody as { error: string }).error ?? 'error' }
  return { ok: true, data: responseBody }
}
