export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { CopyReport } from '@/components/CopyReport'
import { PeriodTabs } from '@/components/PeriodTabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// ── Helpers de período (Argentina UTC-3) ──────────────────────────────────────

const AR_MS = 3 * 60 * 60 * 1000

function arNow() {
  return new Date(Date.now() - AR_MS)
}

function startOfDayUTC(arDate: Date): Date {
  return new Date(Date.UTC(arDate.getUTCFullYear(), arDate.getUTCMonth(), arDate.getUTCDate()) + AR_MS)
}

function getPeriod(period: string): { from: Date; label: string } {
  const ar = arNow()
  switch (period) {
    case 'hoy':
      return { from: startOfDayUTC(ar), label: 'Hoy' }
    case 'semana': {
      const dow = ar.getUTCDay()
      const d = new Date(ar); d.setUTCDate(ar.getUTCDate() - (dow === 0 ? 6 : dow - 1))
      return { from: startOfDayUTC(d), label: 'Esta semana (lun–dom)' }
    }
    case 'mes': {
      const d = new Date(ar); d.setUTCDate(1)
      return { from: startOfDayUTC(d), label: 'Este mes' }
    }
    case '30d':
      return { from: new Date(Date.now() - 30 * 86400000), label: 'Últimos 30 días' }
    default:
      return { from: new Date(Date.now() - 7 * 86400000), label: 'Últimos 7 días' }
  }
}

// ── Helpers de métricas ───────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b === 0 ? '—' : `${Math.round((a / b) * 100)}%`
}

function avgDays(pairs: { a: string | null; b: string | null }[]): string {
  const diffs = pairs.filter(p => p.a && p.b).map(p =>
    (new Date(p.b!).getTime() - new Date(p.a!).getTime()) / 86400000
  )
  if (diffs.length === 0) return '—'
  const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length
  return avg < 1 ? '< 1 día' : `${Math.round(avg * 10) / 10} días`
}

const RAZON_LABELS: Record<string, string> = {
  ya_tiene_web:      'Ya tiene web',
  inactivo:          'Inactivo',
  no_es_alojamiento: 'No es alojamiento',
  otro:              'Otro',
}

function parseList(t: string) {
  return (t || '').split(',').map(s => s.trim()).filter(Boolean)
}

interface GroupStat { name: string; total: number; calificados: number; contactados: number; pct: number }

function buildGroupStats(
  leads: { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean }[],
  field: 'nichos' | 'ubicaciones'
): GroupStat[] {
  const map = new Map<string, { total: number; calificados: number; contactados: number }>()
  for (const l of leads) {
    for (const key of parseList(l[field])) {
      if (!map.has(key)) map.set(key, { total: 0, calificados: 0, contactados: 0 })
      const e = map.get(key)!
      e.total++
      if (l.calificado === true) e.calificados++
      if (l.contactado) e.contactados++
    }
  }
  return Array.from(map.entries())
    .map(([name, s]) => ({ name, ...s, pct: s.total > 0 ? Math.round((s.calificados / s.total) * 100) : 0 }))
    .filter(s => s.total >= 2)
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 10)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const { period = '7d' } = await searchParams
  const { from, label } = getPeriod(period)
  const fromStr = from.toISOString()
  const now = new Date()

  const supabase = getSupabase()

  const [
    foundRes, qualifiedRes, disqualifiedRes, contactedRes,
    searchesRes,
    reviewTimeRes, contactTimeRes, reasonsRes,
    allLeadsRes,
    totalRes, pendingRes, allQualRes, allContRes,
  ] = await Promise.all([
    // Período
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('first_seen_at', fromStr),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', fromStr).eq('calificado', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', fromStr).eq('calificado', false),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('contacted_at', fromStr),
    supabase.from('searches').select('*').gte('ran_at', fromStr).order('new_leads', { ascending: false }),
    // Tiempos
    supabase.from('leads').select('first_seen_at, qualified_at').gte('qualified_at', fromStr).not('calificado', 'is', null),
    supabase.from('leads').select('qualified_at, contacted_at').gte('contacted_at', fromStr),
    supabase.from('leads').select('descarte_razon').gte('qualified_at', fromStr).eq('calificado', false),
    // Rendimiento histórico
    supabase.from('leads').select('nichos, ubicaciones, calificado, contactado'),
    // Totales históricos
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).is('calificado', null),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('contactado', true),
  ])

  const foundCount        = foundRes.count ?? 0
  const qualifiedCount    = qualifiedRes.count ?? 0
  const disqualifiedCount = disqualifiedRes.count ?? 0
  const contactedCount    = contactedRes.count ?? 0
  const reviewedCount     = qualifiedCount + disqualifiedCount
  const searches          = searchesRes.data || []

  const reviewTime  = avgDays((reviewTimeRes.data || []).map(r => ({ a: r.first_seen_at, b: r.qualified_at })))
  const contactTime = avgDays((contactTimeRes.data || []).map(r => ({ a: r.qualified_at,  b: r.contacted_at })))

  const reasonMap = (reasonsRes.data || []).reduce((acc, r) => {
    const k = r.descarte_razon || 'otro'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const reasonEntries = Object.entries(reasonMap)
    .map(([k, n]) => ({ label: RAZON_LABELS[k] || k, count: n, pct: disqualifiedCount > 0 ? Math.round((n / disqualifiedCount) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  const allLeads       = (allLeadsRes.data || []) as { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean }[]
  const nichoStats     = buildGroupStats(allLeads, 'nichos')
  const ubicacionStats = buildGroupStats(allLeads, 'ubicaciones')

  const totalLeads       = totalRes.count ?? 0
  const totalPending     = pendingRes.count ?? 0
  const totalCalificados = allQualRes.count ?? 0
  const totalContactados = allContRes.count ?? 0

  const avgNewLeads = searches.length > 0
    ? Math.round((searches.reduce((s, r) => s + r.new_leads, 0) / searches.length) * 10) / 10
    : 0

  const periodLabel = `${from.toLocaleDateString('es-AR')} – ${now.toLocaleDateString('es-AR')}`

  const reporteTexto = `=== REPORTE — IG LEADS ===
Período: ${label} (${periodLabel})

ACTIVIDAD DEL PERÍODO
- Leads encontrados: ${foundCount}
- Búsquedas realizadas: ${searches.length}
- Promedio nuevos/búsqueda: ${avgNewLeads}
- Leads revisados: ${reviewedCount}
- Calificados: ${qualifiedCount} (${pct(qualifiedCount, reviewedCount)} de revisados)
- Descartados: ${disqualifiedCount} (${pct(disqualifiedCount, reviewedCount)} de revisados)
- Contactados en período: ${contactedCount}

TIEMPOS PROMEDIO
- Descubrimiento → revisión: ${reviewTime}
- Calificación → contacto: ${contactTime}

MOTIVOS DE DESCARTE
${reasonEntries.map(r => `- ${r.label}: ${r.count} (${r.pct}%)`).join('\n') || '- Sin datos'}

ESTADO ACTUAL (histórico)
- Total en DB: ${totalLeads}
- Sin revisar: ${totalPending}
- Calificados esperando contacto: ${totalCalificados}
- Total contactados: ${totalContactados}

MEJORES NICHOS (histórico, mín. 2 leads)
${nichoStats.map((s, i) => `${i + 1}. ${s.name}: ${s.pct}% calificación (${s.calificados}/${s.total})`).join('\n')}

MEJORES UBICACIONES (histórico, mín. 2 leads)
${ubicacionStats.map((s, i) => `${i + 1}. ${s.name}: ${s.pct}% calificación (${s.calificados}/${s.total})`).join('\n')}
`

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-cream">Reportes</h1>
          <p className="text-muted text-sm mt-1">{label} · {periodLabel}</p>
        </div>
        <CopyReport text={reporteTexto} />
      </div>

      {/* Period tabs */}
      <PeriodTabs current={period} />

      {/* ── Resumen del período ── */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mt-7 mb-3">Resumen del período</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {([
          { label: 'Encontrados',  value: foundCount,       sub: `${searches.length} búsqueda${searches.length !== 1 ? 's' : ''}` },
          { label: 'Revisados',    value: reviewedCount,    sub: pct(reviewedCount, foundCount) + ' de encontrados' },
          { label: 'Calificados',  value: qualifiedCount,   sub: pct(qualifiedCount, reviewedCount) + ' de revisados' },
          { label: 'Contactados',  value: contactedCount,   sub: pct(contactedCount, qualifiedCount) + ' de calificados' },
        ] as const).map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-navy dark:text-cream">{c.value}</p>
              <p className="text-xs text-muted mt-1">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Embudo ── */}
      {(foundCount > 0 || reviewedCount > 0) && (
        <>
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Embudo del período</p>
          <Card className="mb-8">
            <CardContent className="p-5 flex flex-col gap-3">
              {([
                { label: 'Encontrados', n: foundCount,       base: foundCount,      color: 'bg-brand' },
                { label: 'Revisados',   n: reviewedCount,    base: foundCount,      color: 'bg-brand/70' },
                { label: 'Calificados', n: qualifiedCount,   base: reviewedCount,   color: 'bg-green-500' },
                { label: 'Contactados', n: contactedCount,   base: qualifiedCount,  color: 'bg-green-700' },
              ] as const).map((row) => {
                const p = row.base > 0 ? Math.round((row.n / row.base) * 100) : 0
                return (
                  <div key={row.label} className="flex items-center gap-3">
                    <span className="w-24 text-sm text-muted text-right shrink-0">{row.label}</span>
                    <div className="flex-1 bg-surface dark:bg-navy rounded-full h-2.5 overflow-hidden">
                      <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(p, 2)}%` }} />
                    </div>
                    <span className="w-8 text-sm font-bold text-navy dark:text-cream text-right shrink-0">{row.n}</span>
                    <span className="w-10 text-xs text-muted text-right shrink-0">{p}%</span>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </>
      )}

      {/* ── Calificación + Contacto ── */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">

        <Card>
          <CardHeader>
            <CardTitle>Calificación</CardTitle>
            <CardDescription>Actividad en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Tasa de calificación</p>
                <p className="text-xl font-bold text-navy dark:text-cream">{pct(qualifiedCount, reviewedCount)}</p>
              </div>
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Desc. → revisión</p>
                <p className="text-xl font-bold text-navy dark:text-cream">{reviewTime}</p>
              </div>
            </div>

            {reasonEntries.length > 0 ? (
              <div>
                <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2.5">Motivos de descarte</p>
                <div className="flex flex-col gap-2.5">
                  {reasonEntries.map((r) => (
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="w-36 text-sm text-navy dark:text-cream/80 truncate shrink-0">{r.label}</span>
                      <div className="flex-1 bg-surface dark:bg-navy rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.max(r.pct, 4)}%` }} />
                      </div>
                      <span className="text-xs text-muted shrink-0 w-16 text-right">{r.pct}% ({r.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted">Sin descartados en este período</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contacto y Prospección</CardTitle>
            <CardDescription>Actividad en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Tasa de conversión</p>
                <p className="text-xl font-bold text-navy dark:text-cream">{pct(contactedCount, qualifiedCount)}</p>
                <p className="text-xs text-muted mt-0.5">calificado → contactado</p>
              </div>
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Calif. → contacto</p>
                <p className="text-xl font-bold text-navy dark:text-cream">{contactTime}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Búsquedas</p>
                <p className="text-xl font-bold text-navy dark:text-cream">{searches.length}</p>
              </div>
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Nuevos / búsqueda</p>
                <p className="text-xl font-bold text-navy dark:text-cream">{avgNewLeads}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Estado actual ── */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Estado actual (total histórico)</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {([
          { label: 'Total en DB',          value: totalLeads },
          { label: 'Sin revisar',          value: totalPending },
          { label: 'Listos para contactar', value: totalCalificados },
          { label: 'Contactados',          value: totalContactados },
        ] as const).map((c) => (
          <Card key={c.label} className="bg-navy dark:bg-navy-card border-navy-border">
            <CardContent className="p-4">
              <p className="text-xs text-white/50 mb-1">{c.label}</p>
              <p className="text-2xl font-bold text-cream">{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Rendimiento histórico ── */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Rendimiento histórico</p>
      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Mejores nichos</CardTitle>
            <CardDescription>Por % de calificación · mín. 2 leads</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nicho</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Calif.</TableHead>
                <TableHead className="text-center">Cont.</TableHead>
                <TableHead className="text-center">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nichoStats.length === 0
                ? <TableRow><TableCell colSpan={5} className="text-center text-muted py-6">Sin datos suficientes</TableCell></TableRow>
                : nichoStats.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-navy dark:text-cream/80 max-w-[130px] truncate">{s.name}</TableCell>
                    <TableCell className="text-center text-muted">{s.total}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                    <TableCell className="text-center text-brand font-medium">{s.contactados}</TableCell>
                    <TableCell className="text-center"><Badge>{s.pct}%</Badge></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>

        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Mejores ubicaciones</CardTitle>
            <CardDescription>Por % de calificación · mín. 2 leads</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Calif.</TableHead>
                <TableHead className="text-center">Cont.</TableHead>
                <TableHead className="text-center">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ubicacionStats.length === 0
                ? <TableRow><TableCell colSpan={5} className="text-center text-muted py-6">Sin datos suficientes</TableCell></TableRow>
                : ubicacionStats.map((s) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-navy dark:text-cream/80 max-w-[130px] truncate">{s.name}</TableCell>
                    <TableCell className="text-center text-muted">{s.total}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                    <TableCell className="text-center text-brand font-medium">{s.contactados}</TableCell>
                    <TableCell className="text-center"><Badge>{s.pct}%</Badge></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* ── Búsquedas del período ── */}
      <Card className="overflow-x-auto">
        <CardHeader>
          <CardTitle>Búsquedas del período</CardTitle>
          <CardDescription>Ordenadas por leads nuevos · {searches.length} en total</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nicho</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-center">Encontrados</TableHead>
              <TableHead className="text-center">Nuevos</TableHead>
              <TableHead className="hidden md:table-cell">Fecha y hora</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {searches.length === 0
              ? <TableRow><TableCell colSpan={5} className="text-center text-muted py-8">Sin búsquedas en este período</TableCell></TableRow>
              : searches.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="text-navy dark:text-cream/80">{s.niche}</TableCell>
                  <TableCell className="text-navy dark:text-cream/80">{s.location}</TableCell>
                  <TableCell className="text-center text-muted">{s.results_found}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.new_leads > 0 ? 'success' : 'secondary'}>{s.new_leads}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted text-xs">
                    {new Date(s.ran_at).toLocaleString('es-AR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      timeZone: 'America/Argentina/Buenos_Aires',
                    })}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

    </main>
  )
}
