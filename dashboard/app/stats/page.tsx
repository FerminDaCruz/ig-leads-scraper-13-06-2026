export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { Nav } from '@/components/Nav'
import { CopyReport } from '@/components/CopyReport'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

function parseList(text: string): string[] {
  return text.split(',').map((s) => s.trim()).filter(Boolean)
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

  const todayStart = new Date(now)
  todayStart.setUTCHours(3, 0, 0, 0)
  if (now.getUTCHours() < 3) todayStart.setUTCDate(todayStart.getUTCDate() - 1)
  const todayStr = todayStart.toISOString()

  const [leadsRes, searchesRes, newLeadsRes, qualifiedRes, todaySearchesRes, todayNewLeadsRes, todayQualifiedRes] = await Promise.all([
    supabase.from('leads').select('nichos, ubicaciones, calificado, contactado, qualified_at'),
    supabase.from('searches').select('niche, location, results_found, new_leads, ran_at').gte('ran_at', weekAgoStr).order('new_leads', { ascending: false }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('first_seen_at', weekAgoStr),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', weekAgoStr),
    supabase.from('searches').select('id', { count: 'exact', head: true }).gte('ran_at', todayStr),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('first_seen_at', todayStr),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', todayStr),
  ])

  const allLeads = (leadsRes.data || []) as {
    nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean; qualified_at: string | null
  }[]
  const searches = searchesRes.data || []
  const newLeadsCount   = newLeadsRes.count ?? 0
  const qualifiedThisWeek = qualifiedRes.count ?? 0
  const todaySearches   = todaySearchesRes.count ?? 0
  const todayNewLeads   = todayNewLeadsRes.count ?? 0
  const todayQualified  = todayQualifiedRes.count ?? 0

  const totalLeads       = allLeads.length
  const totalCalificados = allLeads.filter((l) => l.calificado === true).length
  const totalContactados = allLeads.filter((l) => l.contactado).length
  const totalSinRevisar  = allLeads.filter((l) => l.calificado === null).length
  const reviewedThisWeek = allLeads.filter((l) => l.qualified_at && new Date(l.qualified_at) >= weekAgo).length
  const descartadosThisWeek = reviewedThisWeek - qualifiedThisWeek

  const nichoStats     = buildGroupStats(allLeads, 'nichos', weekAgo)
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
            <h1 className="text-2xl font-bold text-navy dark:text-cream">Reportes</h1>
            <p className="text-muted text-sm mt-1">
              {now.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'America/Argentina/Buenos_Aires' })}
            </p>
          </div>
          <CopyReport text={reporteTexto} />
        </div>

        {/* Hoy */}
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Hoy</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Búsquedas realizadas', value: todaySearches },
            { label: 'Perfiles nuevos',       value: todayNewLeads },
            { label: 'Calificados',           value: todayQualified },
            { label: 'Pendientes en total',   value: totalSinRevisar },
          ].map((card) => (
            <Card key={card.label} className="bg-navy dark:bg-navy-card border-navy-border">
              <CardContent className="p-4">
                <p className="text-xs text-white/50 mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-cream">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Esta semana */}
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Esta semana</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Búsquedas esta semana',    value: searches.length },
            { label: 'Perfiles nuevos',          value: newLeadsCount },
            { label: 'Calificados esta semana',  value: qualifiedThisWeek },
            { label: '% calificación semanal',   value: pct(qualifiedThisWeek, reviewedThisWeek) },
          ].map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-navy dark:text-cream">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Totales */}
        <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Totales históricos</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total en DB',         value: totalLeads },
            { label: 'Sin revisar',         value: totalSinRevisar },
            { label: 'Calificados (total)', value: totalCalificados },
            { label: 'Contactados (total)', value: totalContactados },
          ].map((card) => (
            <Card key={card.label}>
              <CardContent className="p-4">
                <p className="text-xs text-muted mb-1">{card.label}</p>
                <p className="text-2xl font-bold text-navy dark:text-cream">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Nichos y ubicaciones */}
        <div className="grid md:grid-cols-2 gap-6 mb-6">
          <Card className="overflow-x-auto">
            <CardHeader>
              <CardTitle>Mejores nichos</CardTitle>
              <CardDescription>Por % de calificación (mín. 3 leads)</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nicho</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Calif.</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {nichoStats.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-navy dark:text-cream/80 truncate max-w-[140px]">{s.name}</TableCell>
                    <TableCell className="text-center text-muted">{s.total}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                    <TableCell className="text-center">
                      <Badge>{s.pct}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {nichoStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted py-6">Sin datos suficientes</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>

          <Card className="overflow-x-auto">
            <CardHeader>
              <CardTitle>Mejores ubicaciones</CardTitle>
              <CardDescription>Por % de calificación (mín. 3 leads)</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ubicación</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Calif.</TableHead>
                  <TableHead className="text-center">%</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ubicacionStats.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-navy dark:text-cream/80 truncate max-w-[140px]">{s.name}</TableCell>
                    <TableCell className="text-center text-muted">{s.total}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                    <TableCell className="text-center">
                      <Badge>{s.pct}%</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {ubicacionStats.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted py-6">Sin datos suficientes</TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>

        {/* Búsquedas más efectivas */}
        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Búsquedas más efectivas esta semana</CardTitle>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nicho</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Nuevos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {searches.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="text-navy dark:text-cream/80">{s.niche}</TableCell>
                  <TableCell className="text-navy dark:text-cream/80">{s.location}</TableCell>
                  <TableCell className="text-center text-muted">{s.results_found}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="success">{s.new_leads}</Badge>
                  </TableCell>
                </TableRow>
              ))}
              {searches.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted py-8">
                    Sin búsquedas esta semana todavía
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Card>
      </main>
    </>
  )
}
