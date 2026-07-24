import { createClient } from '@supabase/supabase-js'

export function getSupabase() {
  // service_role: acceso server-side que ignora RLS. Nunca exponer al navegador.
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false },
  })
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
  resultado: 'no_interesado' | 'bloqueado' | 'no_recibe_mensajes' | null
  resultado_at: string | null
  // Canal por el que se sigue el contacto (no por el que se hizo todo).
  canal: 'instagram' | 'whatsapp' | 'llamada'
  canal_motivo: 'no_recibe_mensajes' | 'tiene_cm' | 'no_responde_ig' | null
  canal_at: string | null
  // En espera: ni activo ni muerto, se vuelve a contactar en esta fecha.
  recontactar_at: string | null
  espera_motivo: 'mas_adelante' | 'derivado_al_dueno' | null
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
  canal: 'instagram' | 'whatsapp' | 'llamada'
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
