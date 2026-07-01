'use server'

import { revalidatePath } from 'next/cache'
import { getSupabase } from './supabase'
import { KPI_ETAPAS } from './pipeline-stages'

// Guarda las metas (KPI) de un mes ('YYYY-MM'). Upsert por (mes, etapa).
export async function guardarKpis(mes: string, valores: Record<string, number>) {
  if (!/^\d{4}-\d{2}$/.test(mes)) return
  const supabase = getSupabase()
  const rows = KPI_ETAPAS
    .filter((etapa) => Number.isFinite(valores[etapa]))
    .map((etapa) => ({ mes, etapa, valor: Math.max(0, valores[etapa]), updated_at: new Date().toISOString() }))
  if (rows.length === 0) return
  await supabase.from('kpis').upsert(rows, { onConflict: 'mes,etapa' })
  revalidatePath('/metricas')
}
