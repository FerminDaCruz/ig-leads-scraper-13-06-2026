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
  // Pipeline / CRM
  nombre_empresa: string | null
  tiene_web: boolean | null
  web_mejorable: boolean | null
  activo_redes: boolean | null
  notas: string | null
  etapa: string
  visto_at: string | null
  interesado_at: string | null
  calendly_at: string | null
  agendado_at: string | null
  cerrado_at: string | null
}

export interface Owner {
  id: number
  lead_id: number
  nombre: string | null
  numero: string | null
  source: string | null
  created_at: string
}

export interface Followup {
  id: number
  lead_id: number
  fase: string
  indice: number
  enviado: boolean
  mensaje: string | null
  fecha: string | null
  source: string | null
  created_at: string
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
