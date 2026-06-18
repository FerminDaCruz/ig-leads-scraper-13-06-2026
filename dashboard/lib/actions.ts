'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'

export async function marcarCalificado(id: number, valor: boolean, razon?: string) {
  const supabase = getSupabase()
  await supabase
    .from('leads')
    .update({
      calificado: valor,
      qualified_at: new Date().toISOString(),
      ...(razon ? { descarte_razon: razon } : { descarte_razon: null }),
    })
    .eq('id', id)
  revalidatePath('/')
  revalidatePath('/contactar')
}

export async function desCalificar(id: number, razon: string) {
  const supabase = getSupabase()
  await supabase
    .from('leads')
    .update({ calificado: false, descarte_razon: razon })
    .eq('id', id)
  revalidatePath('/contactar')
}

export async function marcarContactado(id: number) {
  const supabase = getSupabase()
  await supabase.from('leads').update({ contactado: true }).eq('id', id)
  revalidatePath('/contactar')
}
