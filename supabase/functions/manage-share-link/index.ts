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

function timingSafeEqual(a: string, b: string) {
  const enc = new TextEncoder()
  const ab = enc.encode(a)
  const bb = enc.encode(b)
  if (ab.length !== bb.length) return false
  let diff = 0
  for (let i = 0; i < ab.length; i++) diff |= ab[i] ^ bb[i]
  return diff === 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const adminSecret = Deno.env.get('ADMIN_SECRET') ?? ''
  const provided = req.headers.get('x-admin-secret') ?? ''
  if (!adminSecret || !timingSafeEqual(provided, adminSecret)) {
    return json({ error: 'unauthorized' }, 401)
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_body' }, 400)
  }

  const action = body.action

  if (action === 'list') {
    const { data, error } = await supabase.from('share_links').select('*').order('created_at', { ascending: false })
    if (error) return json({ error: error.message }, 500)
    return json({ links: data })
  }

  if (action === 'create') {
    const scope = body.scope as string
    const ensembleId = (body.ensemble_id as string | undefined) ?? null
    const label = (body.label as string | undefined) ?? null

    if (scope !== 'all' && scope !== 'single_ensemble') return json({ error: 'invalid_scope' }, 400)
    if (scope === 'single_ensemble' && !ensembleId) return json({ error: 'ensemble_id_required' }, 400)
    if (scope === 'all' && ensembleId) return json({ error: 'ensemble_id_not_allowed' }, 400)

    const { data, error } = await supabase
      .from('share_links')
      .insert({ scope, ensemble_id: ensembleId, label })
      .select('*')
      .single()

    if (error) return json({ error: error.message }, 500)
    return json({ link: data })
  }

  if (action === 'revoke') {
    const id = body.id as string
    if (!id) return json({ error: 'id_required' }, 400)
    const { data, error } = await supabase
      .from('share_links')
      .update({ revoked: true })
      .eq('id', id)
      .select('*')
      .single()
    if (error) return json({ error: error.message }, 500)
    return json({ link: data })
  }

  if (action === 'regenerate') {
    const id = body.id as string
    if (!id) return json({ error: 'id_required' }, 400)

    const { data: old, error: oldError } = await supabase
      .from('share_links')
      .update({ revoked: true })
      .eq('id', id)
      .select('*')
      .single()
    if (oldError || !old) return json({ error: oldError?.message ?? 'not_found' }, 404)

    const { data: created, error: createError } = await supabase
      .from('share_links')
      .insert({ scope: old.scope, ensemble_id: old.ensemble_id, label: old.label })
      .select('*')
      .single()
    if (createError) return json({ error: createError.message }, 500)

    return json({ link: created })
  }

  return json({ error: 'unknown_action' }, 400)
})
