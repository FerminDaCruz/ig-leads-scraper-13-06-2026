export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { Nav } from '@/components/Nav'
import { CopyReport } from '@/components/CopyReport'

function parseList(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function pct(a: number, b: number) {
  if (b === 0) return '0%'
  return `${Math.round((a / b) * 100)}%`
}

interface GroupStat {
  name: string
  total: number
  calificados: number
  contactados: number
  pct: number
}

function buildGroupStats(
  leads: { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean; qualified_at: string | null }[],
  field: 'nichos' | 'ubicaciones',
  since: Date
): GroupStat[] {
  const map = new Map<string, { total: number; calificados: number; contactados: number }>()

  for (const lead of leads) {
    const keys = parseList(lead[field])
    for (const key of keys) {
      if (!map.has(key)) map.set(key, { total: 0, calificados: 0, contactados: 0 })
      const entry = map.get(key)!
      entry.total++
      if (lead.calificado === true) entry.calificados++
      if (lead.contactado) entry.contactados++
    }
  }

  return Array.from(map.entries())
    .map(([name, s]) => ({ name, ...s, pct: s.total > 0 ? Math.round((s.calificados / s.total) * 100) : 0 }))
    .filter((s) => s.total >= 3)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10)
}

export default async function StatsPage() {
  const supabase = getSupabase()
  const now = new Date()
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const weekAgoStr = weekAgo.toISOString()

  const [leadsRes, searchesRes, newLeadsRes, qualifiedRes] = await Promise.all([
    supabase.from('leads').select('nichos, ubicaciones, calificado, contactado, qualified_at'),
    supabase.from('searches').select('niche, location, results_found, new_leads, ran_at').gte('ran_at', weekAgoStr).order('new_leads', { ascending: false }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('first_seen_at', weekAgoStr),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', weekAgoStr),
  ])

  const allLeads = (leadsRes.data || []) as {
    nichos: string
    ubicaciones: string
    calificado: boolean | null
    contactado: boolean
    qualified_at: string | null
  }[]
  const searches = searchesRes.data || []
  const newLeadsCount = newLeadsRes.count ?? 0
  const qualifiedThisWeek = qualifiedRes.count ?? 0

  const totalLeads = allLeads.length
  const totalCalificados = allLeads.filter((l) => l.calificado === true).length
  const totalContactados = allLeads.filter((l) => l.contactado).length
  const totalSinRevisar = allLeads.filter((l) => l.calificado === null).length

  const reviewedThisWeek = allLeads.filter(
    (l) => l.qualified_at && new Date(l.qualified_at) >= weekAgo
  ).length
  const descartadosThisWeek = reviewedThisWeek - qualifiedThisWeek

  const nichoStats = buildGroupStats(allLeads, 'nichos', weekAgo)
  const ubicacionStats = buildGroupStats(allLeads, 'ubicaciones', weekAgo)

  const fechaDesde = weekAgo.toLocaleDateString('es-AR')
  const fechaHasta = now.toLocaleDateString('es-AR')

  const reporteTexto = `=== REPORTE SEMANAL — IG LEADS ===
Período: ${fechaDesde} al ${fechaHasta}

SCRAPING ESTA SEMANA
- Búsquedas realizadas: ${searches.length}
- Perfiles nuevos encontrados: ${newLeadsCount}
- Total acumulado en DB: ${totalLeads}

CALIFICACIÓN ESTA SEMANA
- Revisados: ${reviewedThisWeek}
- Calificados: ${qualifiedThisWeek} (${pct(qualifiedThisWeek, reviewedThisWeek)})
- Descartados: ${descartadosThisWeek} (${pct(descartadosThisWeek, reviewedThisWeek)})

TOTALES HISTÓRICOS
- Sin revisar: ${totalSinRevisar}
- Calificados: ${totalCalificados}
- Contactados: ${totalContactados}
- % calificación global: ${pct(totalCalificados, totalLeads - totalSinRevisar)}

MEJORES NICHOS (% calificación, mín. 3 leads)
${nichoStats.map((s, i) => `${i + 1}. ${s.name}: ${s.pct}% (${s.calificados}/${s.total})`).join('\n')}

MEJORES UBICACIONES (% calificación, mín. 3 leads)
${ubicacionStats.map((s, i) => `${i + 1}. ${s.name}: ${s.pct}% (${s.calificados}/${s.total})`).join('\n')}

BÚSQUEDAS MÁS EFECTIVAS ESTA SEMANA
${searches.slice(0, 5).map((s, i) => `${i + 1}. "${s.niche}" + "${s.location}": ${s.new_leads} nuevos (${s.results_found} total)`).join('\n')}
`

  return (
    <>
      <Nav active="stats" />
      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-navy dark:text-cream">Reporte Semanal</h1>
            <p className="text-muted text-sm mt-1">{fechaDesde} - {fechaHasta}</p>
          </div>
          <CopyReport text={reporteTexto} />
        </div>

        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Esta semana</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Búsquedas esta semana', value: searches.length },
            { label: 'Perfiles nuevos', value: newLeadsCount },
            { label: 'Calificados esta semana', value: qualifiedThisWeek },
            { label: '% calificación semanal', value: pct(qualifiedThisWeek, reviewedThisWeek) },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-navy-card border border-surface dark:border-navy-border rounded-xl p-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-xs text-muted mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-navy dark:text-cream">{card.value}</p>
            </div>
          ))}
        </div>

        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Totales historicos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total en DB', value: totalLeads },
            { label: 'Sin revisar', value: totalSinRevisar },
            { label: 'Calificados (total)', value: totalCalificados },
            { label: 'Contactados (total)', value: totalContactados },
          ].map((card) => (
            <div key={card.label} className="bg-white dark:bg-navy-card border border-surface dark:border-navy-border rounded-xl p-4 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <p className="text-xs text-muted mb-1">{card.label}</p>
              <p className="text-2xl font-bold text-navy dark:text-cream">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Nichos */}
          <div className="bg-white dark:bg-navy-card border border-surface dark:border-navy-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface dark:border-navy-border">
              <h2 className="font-semibold text-navy dark:text-cream text-sm">Mejores nichos</h2>
              <p className="text-xs text-muted">Por % de calificación (mín. 3 leads)</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface dark:border-navy-border bg-surface dark:bg-navy">
                  <th className="text-left px-4 py-2 text-muted font-medium text-xs">Nicho</th>
                  <th className="text-center px-4 py-2 text-muted font-medium text-xs">Total</th>
                  <th className="text-center px-4 py-2 text-muted font-medium text-xs">Calif.</th>
                  <th className="text-center px-4 py-2 text-muted font-medium text-xs">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface dark:divide-navy-border">
                {nichoStats.map((s) => (
                  <tr key={s.name} className="hover:bg-cream dark:hover:bg-navy transition-colors">
                    <td className="px-4 py-2 text-navy dark:text-cream/80 truncate max-w-[140px]">{s.name}</td>
                    <td className="px-4 py-2 text-center text-muted">{s.total}</td>
                    <td className="px-4 py-2 text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-brand/20 text-navy dark:text-brand text-xs font-bold">{s.pct}%</span>
                    </td>
                  </tr>
                ))}
                {nichoStats.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Sin datos suficientes</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Ubicaciones */}
          <div className="bg-white dark:bg-navy-card border border-surface dark:border-navy-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-surface dark:border-navy-border">
              <h2 className="font-semibold text-navy dark:text-cream text-sm">Mejores ubicaciones</h2>
              <p className="text-xs text-muted">Por % de calificación (mín. 3 leads)</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface dark:border-navy-border bg-surface dark:bg-navy">
                  <th className="text-left px-4 py-2 text-muted font-medium text-xs">Ubicación</th>
                  <th className="text-center px-4 py-2 text-muted font-medium text-xs">Total</th>
                  <th className="text-center px-4 py-2 text-muted font-medium text-xs">Calif.</th>
                  <th className="text-center px-4 py-2 text-muted font-medium text-xs">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface dark:divide-navy-border">
                {ubicacionStats.map((s) => (
                  <tr key={s.name} className="hover:bg-cream dark:hover:bg-navy transition-colors">
                    <td className="px-4 py-2 text-navy dark:text-cream/80 truncate max-w-[140px]">{s.name}</td>
                    <td className="px-4 py-2 text-center text-muted">{s.total}</td>
                    <td className="px-4 py-2 text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</td>
                    <td className="px-4 py-2 text-center">
                      <span className="px-2 py-0.5 rounded-full bg-brand/20 text-navy dark:text-brand text-xs font-bold">{s.pct}%</span>
                    </td>
                  </tr>
                ))}
                {ubicacionStats.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-6 text-center text-muted">Sin datos suficientes</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Búsquedas más efectivas */}
        <div className="bg-white dark:bg-navy-card border border-surface dark:border-navy-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-surface dark:border-navy-border">
            <h2 className="font-semibold text-navy dark:text-cream text-sm">Búsquedas más efectivas esta semana</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface dark:border-navy-border bg-surface dark:bg-navy">
                <th className="text-left px-4 py-2 text-muted font-medium text-xs">Nicho</th>
                <th className="text-left px-4 py-2 text-muted font-medium text-xs">Ubicación</th>
                <th className="text-center px-4 py-2 text-muted font-medium text-xs">Total</th>
                <th className="text-center px-4 py-2 text-muted font-medium text-xs">Nuevos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface dark:divide-navy-border">
              {searches.map((s, i) => (
                <tr key={i} className="hover:bg-cream dark:hover:bg-navy transition-colors">
                  <td className="px-4 py-2 text-navy dark:text-cream/80">{s.niche}</td>
                  <td className="px-4 py-2 text-navy dark:text-cream/80">{s.location}</td>
                  <td className="px-4 py-2 text-center text-muted">{s.results_found}</td>
                  <td className="px-4 py-2 text-center">
                    <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-bold">{s.new_leads}</span>
                  </td>
                </tr>
              ))}
              {searches.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    Sin búsquedas esta semana todavía
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
