import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)
}

export interface Lead {
  id: number
  username: string
  url: string
  nichos: string
  ubicaciones: string
  veces_encontrado: number
  calificado: boolean | null
  contactado: boolean
  first_seen_at: string
  last_seen_at: string
  qualified_at: string | null
  descarte_razon: string | null
}
