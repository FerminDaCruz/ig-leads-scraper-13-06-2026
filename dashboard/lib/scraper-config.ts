'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'

export async function agregarNicho(name: string) {
  const supabase = getSupabase()
  const v = name.trim()
  if (!v) return
  await supabase.from('niches').upsert({ name: v }, { onConflict: 'name' })
  revalidatePath('/scraper')
}

export async function eliminarNicho(id: number) {
  const supabase = getSupabase()
  await supabase.from('niches').delete().eq('id', id)
  revalidatePath('/scraper')
}

export async function agregarUbicacion(name: string) {
  const supabase = getSupabase()
  const v = name.trim()
  if (!v) return
  await supabase.from('locations').upsert({ name: v }, { onConflict: 'name' })
  revalidatePath('/scraper')
}

export async function eliminarUbicacion(id: number) {
  const supabase = getSupabase()
  await supabase.from('locations').delete().eq('id', id)
  revalidatePath('/scraper')
}

export async function toggleUbicacionOculta(id: number, hidden: boolean) {
  const supabase = getSupabase()
  await supabase.from('locations').update({ hidden_by_default: hidden }).eq('id', id)
  // Afecta qué leads se ocultan por defecto en Calificar y Contactar.
  revalidatePath('/scraper')
  revalidatePath('/')
  revalidatePath('/contactar')
}
