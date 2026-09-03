import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient<Database>(url, anonKey)

export const FUNCTIONS_URL =
  (import.meta.env.VITE_SUPABASE_FUNCTIONS_URL as string | undefined) ?? `${url}/functions/v1`
