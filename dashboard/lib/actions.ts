'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'

export async function marcarCalificado(id: number, valor: boolean, razon?: string) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  await supabase.from('leads').update({ calificado: valor }).eq('id', id)
  await supabase.from('leads').update({ qualified_at: now }).eq('id', id)
  if (razon !== undefined) {
    await supabase.from('leads').update({ descarte_razon: razon }).eq('id', id)
  }
  revalidatePath('/pipeline')
}

export async function calificarLead(id: number, tieneWeb: boolean, notas: string | null) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  await supabase.from('leads').update({ calificado: true }).eq('id', id)
  await supabase.from('leads').update({ qualified_at: now }).eq('id', id)
  await supabase.from('leads').update({ tiene_web: tieneWeb }).eq('id', id)
  if (notas !== null) {
    await supabase.from('leads').update({ notas }).eq('id', id)
  }
  revalidatePath('/pipeline')
}

export async function desCalificar(id: number, razon: string) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  await supabase.from('leads').update({ calificado: false }).eq('id', id)
  await supabase.from('leads').update({ qualified_at: now }).eq('id', id)
  await supabase.from('leads').update({ descarte_razon: razon }).eq('id', id)
  revalidatePath('/pipeline')
}

export async function actualizarUbicacion(id: number, ubicacion: string) {
  const supabase = getSupabase()
  await supabase.from('leads').update({ ubicaciones: ubicacion.trim() }).eq('id', id)
  revalidatePath('/pipeline')
}

export async function marcarContactado(id: number) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  await supabase.from('leads').update({ contactado: true }).eq('id', id)
  // contacted_at es opcional — falla silenciosamente si la columna no existe aún
  await supabase.from('leads').update({ contacted_at: now }).eq('id', id)
  await supabase.from('leads').update({ etapa: 'iniciado' }).eq('id', id)
  revalidatePath('/pipeline')
}
