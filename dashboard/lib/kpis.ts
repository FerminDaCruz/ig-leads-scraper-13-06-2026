'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'
import { KPI_ETAPAS } from './pipeline-stages'

// Guarda las metas (KPI) de un mes ('YYYY-MM'). Upsert por (mes, etapa).
export async function guardarKpis(
  mes: string,
  valores: Record<string, number>
): Promise<{ ok: boolean; error?: string }> {
  if (!/^\d{4}-\d{2}$/.test(mes)) return { ok: false, error: 'Mes inválido' }
  const supabase = getSupabase()
  const rows = KPI_ETAPAS
    .filter((etapa) => Number.isFinite(valores[etapa]))
    .map((etapa) => ({ mes, etapa, valor: Math.max(0, valores[etapa]), updated_at: new Date().toISOString() }))
  if (rows.length === 0) return { ok: false, error: 'Nada para guardar' }
  const { error } = await supabase.from('kpis').upsert(rows, { onConflict: 'mes,etapa' })
  if (error) return { ok: false, error: error.message }
  revalidatePath('/metricas')
  return { ok: true }
}
