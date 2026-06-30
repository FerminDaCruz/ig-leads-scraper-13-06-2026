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
  contacted_at: string | null
  descarte_razon: string | null
  found_via_niche: string | null
  found_via_location: string | null
}

export interface Niche {
  id: number
  name: string
  created_at: string
}

export interface Location {
  id: number
  name: string
  hidden_by_default: boolean
  created_at: string
}

export interface Search {
  id: number
  query: string
  niche: string
  location: string
  results_found: number
  new_leads: number
  ran_at: string
}
