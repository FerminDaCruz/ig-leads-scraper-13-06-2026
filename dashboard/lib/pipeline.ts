'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'
import { ETAPAS, ETAPA_FECHA, FECHA_COLS, FASE_MAX, isEtapa, type Fase } from './pipeline-stages'

function revalidar(id?: number) {
  revalidatePath('/pipeline')
  if (id) revalidatePath(`/pipeline/${id}`)
}

// ── Etapa ───────────────────────────────────────────────────────────────────
export async function cambiarEtapa(id: number, etapa: string) {
  if (!isEtapa(etapa)) return
  const supabase = getSupabase()
  const update: Record<string, unknown> = { etapa }
  const col = ETAPA_FECHA[etapa]
  if (col) {
    // Setea la fecha de la etapa solo si todavía no tiene una.
    const { data } = await supabase.from('leads').select(col).eq('id', id).single()
    const row = data as unknown as Record<string, unknown> | null
    if (row && !row[col]) update[col] = new Date().toISOString()
  }
  // De 'iniciado' en adelante el lead está contactado (sincroniza el booleano
  // que usan Reportes/Métricas/Historial).
  if (ETAPAS.indexOf(etapa) >= ETAPAS.indexOf('iniciado')) update.contactado = true
  await supabase.from('leads').update(update).eq('id', id)
  revalidar(id)
}

export async function actualizarFecha(id: number, columna: string, valorIso: string | null) {
  if (!(FECHA_COLS as readonly string[]).includes(columna)) return
  const supabase = getSupabase()
  await supabase.from('leads').update({ [columna]: valorIso }).eq('id', id)
  revalidar(id)
}

// ── Campos del lead ─────────────────────────────────────────────────────────
export async function actualizarCampos(
  id: number,
  fields: Partial<{
    nombre_empresa: string | null
    tiene_web: boolean | null
    web_mejorable: boolean | null
    activo_redes: boolean | null
    notas: string | null
  }>
) {
  const supabase = getSupabase()
  const allowed = ['nombre_empresa', 'tiene_web', 'web_mejorable', 'activo_redes', 'notas']
  const upd: Record<string, unknown> = {}
  for (const k of allowed) if (k in fields) upd[k] = (fields as Record<string, unknown>)[k]
  if (Object.keys(upd).length === 0) return
  // Si no tiene web, la mejora de web no aplica.
  if (upd.tiene_web === false) upd.web_mejorable = null
  await supabase.from('leads').update(upd).eq('id', id)
  revalidar(id)
}

// ── Dueños ──────────────────────────────────────────────────────────────────
export async function agregarOwner(leadId: number, nombre: string, numero: string) {
  const supabase = getSupabase()
  if (!nombre.trim() && !numero.trim()) return
  await supabase.from('lead_owners').insert({ lead_id: leadId, nombre: nombre.trim() || null, numero: numero.trim() || null, source: 'manual' })
  revalidar(leadId)
}

export async function actualizarOwner(id: number, leadId: number, nombre: string, numero: string) {
  const supabase = getSupabase()
  await supabase.from('lead_owners').update({ nombre: nombre.trim() || null, numero: numero.trim() || null }).eq('id', id)
  revalidar(leadId)
}

export async function eliminarOwner(id: number, leadId: number) {
  const supabase = getSupabase()
  await supabase.from('lead_owners').delete().eq('id', id)
  revalidar(leadId)
}

// ── Seguimientos ────────────────────────────────────────────────────────────
export async function agregarFollowup(leadId: number, fase: string) {
  if (!(fase in FASE_MAX)) return
  const supabase = getSupabase()
  const { data } = await supabase.from('lead_followups').select('indice').eq('lead_id', leadId).eq('fase', fase)
  const usados = (data || []).length
  if (usados >= FASE_MAX[fase as Fase]) return
  await supabase.from('lead_followups').insert({ lead_id: leadId, fase, indice: usados + 1, mensaje: '', enviado: true, source: 'manual' })
  revalidar(leadId)
}

export async function actualizarFollowup(
  id: number,
  leadId: number,
  fields: Partial<{ mensaje: string | null; fecha: string | null; enviado: boolean }>
) {
  const supabase = getSupabase()
  await supabase.from('lead_followups').update(fields).eq('id', id)
  revalidar(leadId)
}

export async function eliminarFollowup(id: number, leadId: number) {
  const supabase = getSupabase()
  await supabase.from('lead_followups').delete().eq('id', id)
  revalidar(leadId)
}
