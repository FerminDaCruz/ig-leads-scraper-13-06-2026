import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { appendFileSync } from 'fs'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  realtime: { transport: ws },
})

function pct(a: number, b: number) {
  if (b === 0) return '0%'
  return `${Math.round((a / b) * 100)}%`
}

function parseList(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean)
}

async function main() {
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekAgoStr = weekAgo.toISOString()

  const [leadsRes, searchesRes, newLeadsRes, qualifiedRes] = await Promise.all([
    supabase.from('leads').select('nichos, ubicaciones, calificado, contactado, qualified_at'),
    supabase.from('searches').select('niche, location, results_found, new_leads, ran_at').gte('ran_at', weekAgoStr).order('new_leads', { ascending: false }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('first_seen_at', weekAgoStr),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', weekAgoStr),
  ])

  const allLeads = (leadsRes.data || []) as { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean; qualified_at: string | null }[]
  const searches = searchesRes.data || []
  const newLeadsCount = newLeadsRes.count ?? 0
  const qualifiedThisWeek = qualifiedRes.count ?? 0

  const totalLeads = allLeads.length
  const totalCalificados = allLeads.filter((l) => l.calificado === true).length
  const totalContactados = allLeads.filter((l) => l.contactado).length
  const totalSinRevisar = allLeads.filter((l) => l.calificado === null).length
  const reviewedThisWeek = allLeads.filter((l) => l.qualified_at && new Date(l.qualified_at) >= weekAgo).length
  const descartadosThisWeek = reviewedThisWeek - qualifiedThisWeek

  // Stats por nicho
  const nichoMap = new Map<string, { total: number; calificados: number }>()
  for (const lead of allLeads) {
    for (const nicho of parseList(lead.nichos)) {
      if (!nichoMap.has(nicho)) nichoMap.set(nicho, { total: 0, calificados: 0 })
      const e = nichoMap.get(nicho)!
      e.total++
      if (lead.calificado === true) e.calificados++
    }
  }
  const nichoStats = Array.from(nichoMap.entries())
    .map(([name, s]) => ({ name, ...s, pct: s.total > 0 ? Math.round((s.calificados / s.total) * 100) : 0 }))
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)

  // Stats por ubicación
  const ubicMap = new Map<string, { total: number; calificados: number }>()
  for (const lead of allLeads) {
    for (const ub of parseList(lead.ubicaciones)) {
      if (!ubicMap.has(ub)) ubicMap.set(ub, { total: 0, calificados: 0 })
      const e = ubicMap.get(ub)!
      e.total++
      if (lead.calificado === true) e.calificados++
    }
  }
  const ubicStats = Array.from(ubicMap.entries())
    .map(([name, s]) => ({ name, ...s, pct: s.total > 0 ? Math.round((s.calificados / s.total) * 100) : 0 }))
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 8)

  const fechaDesde = weekAgo.toLocaleDateString('es-AR')
  const fechaHasta = now.toLocaleDateString('es-AR')

  const reporte = `=== REPORTE SEMANAL — IG LEADS ===
Período: ${fechaDesde} al ${fechaHasta}

📊 SCRAPING ESTA SEMANA
- Búsquedas realizadas: ${searches.length}
- Perfiles nuevos encontrados: ${newLeadsCount}
- Total acumulado en DB: ${totalLeads}

✅ CALIFICACIÓN ESTA SEMANA
- Revisados: ${reviewedThisWeek}
- Calificados: ${qualifiedThisWeek} (${pct(qualifiedThisWeek, reviewedThisWeek)})
- Descartados: ${descartadosThisWeek} (${pct(descartadosThisWeek, reviewedThisWeek)})

📈 TOTALES HISTÓRICOS
- Sin revisar: ${totalSinRevisar}
- Calificados: ${totalCalificados}
- Contactados: ${totalContactados}
- % calificación global: ${pct(totalCalificados, totalLeads - totalSinRevisar)}

🏆 MEJORES NICHOS (% calificación, mín. 3 leads)
${nichoStats.map((s, i) => `${i + 1}. ${s.name}: ${s.pct}% (${s.calificados}/${s.total})`).join('\n')}

📍 MEJORES UBICACIONES (% calificación, mín. 3 leads)
${ubicStats.map((s, i) => `${i + 1}. ${s.name}: ${s.pct}% (${s.calificados}/${s.total})`).join('\n')}

🔍 BÚSQUEDAS MÁS EFECTIVAS ESTA SEMANA
${searches.slice(0, 8).map((s, i) => `${i + 1}. "${s.niche}" + "${s.location}": ${s.new_leads} nuevos (${s.results_found} total)`).join('\n')}
`

  console.log(reporte)

  // Escribe al Step Summary de GitHub Actions si está disponible
  const summaryFile = process.env.GITHUB_STEP_SUMMARY
  if (summaryFile) {
    const markdown = `# Reporte Semanal — IG Leads\n**Período:** ${fechaDesde} al ${fechaHasta}\n\n\`\`\`\n${reporte}\n\`\`\``
    appendFileSync(summaryFile, markdown)
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
