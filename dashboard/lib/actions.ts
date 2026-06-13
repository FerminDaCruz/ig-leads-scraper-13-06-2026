'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'

export async function marcarCalificado(id: number, valor: boolean) {
  const supabase = getSupabase()
  await supabase
    .from('leads')
    .update({ calificado: valor, qualified_at: new Date().toISOString() })
    .eq('id', id)
  revalidatePath('/')
}

export async function marcarContactado(id: number) {
  const supabase = getSupabase()
  await supabase.from('leads').update({ contactado: true }).eq('id', id)
  revalidatePath('/contactar')
}
