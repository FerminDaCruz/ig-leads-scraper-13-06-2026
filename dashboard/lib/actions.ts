'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'

export async function marcarCalificado(id: number, valor: boolean, razon?: string) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  await supabase
    .from('leads')
    .update({ calificado: valor, qualified_at: now })
    .eq('id', id)
  if (razon !== undefined) {
    await supabase.from('leads').update({ descarte_razon: razon }).eq('id', id)
  }
  revalidatePath('/')
  revalidatePath('/contactar')
}

export async function desCalificar(id: number, razon: string) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  await supabase.from('leads').update({ calificado: false, qualified_at: now }).eq('id', id)
  await supabase.from('leads').update({ descarte_razon: razon }).eq('id', id)
  revalidatePath('/contactar')
}

export async function marcarContactado(id: number) {
  const supabase = getSupabase()
  const now = new Date().toISOString()
  await supabase.from('leads').update({ contactado: true, contacted_at: now }).eq('id', id)
  revalidatePath('/contactar')
}
