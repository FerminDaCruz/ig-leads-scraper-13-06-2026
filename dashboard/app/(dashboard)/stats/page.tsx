export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { CopyReport } from '@/components/CopyReport'
import { PeriodTabs } from '@/components/PeriodTabs'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// ── Período (Argentina UTC-3) ─────────────────────────────────────────────────

const AR_MS = 3 * 60 * 60 * 1000

function arNow() { return new Date(Date.now() - AR_MS) }

function startOfDayUTC(ar: Date): Date {
  return new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth(), ar.getUTCDate()) + AR_MS)
}

function getPeriod(period: string, dateParam?: string): { from: Date; to: Date; label: string; exactDay: boolean } {
  const ar  = arNow()
  const now = new Date()
  switch (period) {
    case 'hoy':
      return { from: startOfDayUTC(ar), to: now, label: 'Hoy', exactDay: true }
    case 'dia': {
      if (dateParam) {
        const [y, m, d] = dateParam.split('-').map(Number)
        const arD  = new Date(Date.UTC(y, m - 1, d))
        const from = new Date(arD.getTime() + AR_MS)
        const to   = new Date(arD.getTime() + AR_MS + 86400000)
        const label = arD.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'UTC' })
        return { from, to, label, exactDay: true }
      }
      return { from: new Date(Date.now() - 7 * 86400000), to: now, label: 'Últimos 7 días', exactDay: false }
    }
    case 'semana': {
      const dow = ar.getUTCDay()
      const d = new Date(ar); d.setUTCDate(ar.getUTCDate() - (dow === 0 ? 6 : dow - 1))
      return { from: startOfDayUTC(d), to: now, label: 'Esta semana (lun–dom)', exactDay: false }
    }
    case 'mes': {
      const d = new Date(ar); d.setUTCDate(1)
      return { from: startOfDayUTC(d), to: now, label: 'Este mes', exactDay: false }
    }
    case '30d':
      return { from: new Date(Date.now() - 30 * 86400000), to: now, label: 'Últimos 30 días', exactDay: false }
    default:
      return { from: new Date(Date.now() - 7 * 86400000), to: now, label: 'Últimos 7 días', exactDay: false }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b === 0 ? '—' : `${Math.round((a / b) * 100)}%`
}

function avgDays(pairs: { a: string | null; b: string | null }[]): string {
  const diffs = pairs.filter(p => p.a && p.b)
    .map(p => (new Date(p.b!).getTime() - new Date(p.a!).getTime()) / 86400000)
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; date?: string }>
}) {
  const { period = '7d', date } = await searchParams
  const { from, to, label, exactDay } = getPeriod(period, date)
  const fromStr = from.toISOString()
  const toStr   = to.toISOString()
  const now = new Date()

  const supabase = getSupabase()

  const [
    foundRes, qualifiedRes, disqualifiedRes, contactedRes,
    searchesRes, reviewTimeRes, contactTimeRes, reasonsRes,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('first_seen_at', fromStr).lt('first_seen_at', toStr),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', fromStr).lt('qualified_at', toStr).eq('calificado', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('qualified_at', fromStr).lt('qualified_at', toStr).eq('calificado', false),
    supabase.from('leads').select('id', { count: 'exact', head: true }).gte('contacted_at', fromStr).lt('contacted_at', toStr),
    supabase.from('searches').select('*').gte('ran_at', fromStr).lt('ran_at', toStr).order('new_leads', { ascending: false }),
    supabase.from('leads').select('first_seen_at, qualified_at').gte('qualified_at', fromStr).lt('qualified_at', toStr).not('calificado', 'is', null),
    supabase.from('leads').select('qualified_at, contacted_at').gte('contacted_at', fromStr).lt('contacted_at', toStr),
    supabase.from('leads').select('descarte_razon').gte('qualified_at', fromStr).lt('qualified_at', toStr).eq('calificado', false),
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

  const avgNewLeads = searches.length > 0
    ? Math.round((searches.reduce((s, r) => s + r.new_leads, 0) / searches.length) * 10) / 10
    : 0

  const periodLabel = exactDay
    ? from.toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
    : `${from.toLocaleDateString('es-AR')} – ${now.toLocaleDateString('es-AR')}`

  const reporteTexto = `=== REPORTE — IG LEADS ===
Período: ${label} (${periodLabel})

ACTIVIDAD
- Encontrados: ${foundCount}  |  Búsquedas: ${searches.length}  |  Prom. nuevos/búsqueda: ${avgNewLeads}
- Revisados: ${reviewedCount} (${pct(reviewedCount, foundCount)} de encontrados)
- Calificados: ${qualifiedCount} (${pct(qualifiedCount, reviewedCount)} de revisados)
- Descartados: ${disqualifiedCount} (${pct(disqualifiedCount, reviewedCount)} de revisados)
- Contactados: ${contactedCount} (${pct(contactedCount, qualifiedCount)} de calificados)

TIEMPOS PROMEDIO
- Descubrimiento → revisión: ${reviewTime}
- Calificación → contacto: ${contactTime}

MOTIVOS DE DESCARTE
${reasonEntries.map(r => `- ${r.label}: ${r.count} (${r.pct}%)`).join('\n') || '- Sin datos'}
`

  // Cards resumen
  const summaryCards = [
    { label: 'Encontrados',  value: foundCount,        sub: `${searches.length} búsqueda${searches.length !== 1 ? 's' : ''}`,   color: 'text-brand' },
    { label: 'Revisados',    value: reviewedCount,     sub: pct(reviewedCount, foundCount) + ' de encontrados',                  color: 'text-navy dark:text-cream' },
    { label: 'Calificados',  value: qualifiedCount,    sub: pct(qualifiedCount, reviewedCount) + ' de revisados',                color: 'text-green-600 dark:text-green-400' },
    { label: 'Descartados',  value: disqualifiedCount, sub: pct(disqualifiedCount, reviewedCount) + ' de revisados',             color: 'text-red-500 dark:text-red-400' },
    { label: 'Contactados',  value: contactedCount,    sub: pct(contactedCount, qualifiedCount) + ' de calificados',             color: 'text-navy dark:text-cream' },
  ]

  const funnelRows = [
    { label: 'Encontrados', n: foundCount,        base: foundCount,      color: 'bg-brand' },
    { label: 'Revisados',   n: reviewedCount,     base: foundCount,      color: 'bg-brand/70' },
    { label: 'Calificados', n: qualifiedCount,    base: reviewedCount,   color: 'bg-green-500' },
    { label: 'Descartados', n: disqualifiedCount, base: reviewedCount,   color: 'bg-red-400' },
    { label: 'Contactados', n: contactedCount,    base: qualifiedCount,  color: 'bg-green-700' },
  ]

  return (
    <main className="max-w-7xl mx-auto px-6 py-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-cream">Reportes</h1>
          <p className="text-muted text-sm mt-1">{label} · {periodLabel}</p>
        </div>
        <CopyReport text={reporteTexto} />
      </div>

      {/* Tabs de período */}
      <PeriodTabs current={period} currentDate={date} />

      {/* ── 5 cards resumen ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-7 mb-6">
        {summaryCards.map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted mb-1.5">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-muted mt-1.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Fila principal: Embudo + Calificación ── */}
      <div className="grid lg:grid-cols-5 gap-4 mb-4">

        {/* Embudo — 3 cols */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Embudo</CardTitle>
            <CardDescription>Conversión paso a paso en el período</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 flex flex-col gap-4">
            {funnelRows.map((row) => {
              const p = row.base > 0 ? Math.round((row.n / row.base) * 100) : 0
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-muted text-right shrink-0">{row.label}</span>
                  <div className="flex-1 bg-surface dark:bg-navy rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${row.color} transition-all`} style={{ width: `${Math.max(p, 1)}%` }} />
                  </div>
                  <span className="w-8 text-sm font-bold text-navy dark:text-cream text-right shrink-0">{row.n}</span>
                  <span className="w-10 text-xs text-muted text-right shrink-0">{p}%</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Calificación — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Calificación</CardTitle>
            <CardDescription>Tasas y tiempos del período</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Tasa calificación</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{pct(qualifiedCount, reviewedCount)}</p>
              </div>
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Tasa descarte</p>
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">{pct(disqualifiedCount, reviewedCount)}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Desc. → revisión</p>
                <p className="text-lg font-bold text-navy dark:text-cream">{reviewTime}</p>
              </div>
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Calif. → contacto</p>
                <p className="text-lg font-bold text-navy dark:text-cream">{contactTime}</p>
              </div>
            </div>

            {reasonEntries.length > 0 && (
              <div>
                <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Motivos de descarte</p>
                <div className="flex flex-col gap-2">
                  {reasonEntries.map((r) => (
                    <div key={r.label} className="flex items-center gap-2">
                      <span className="w-32 text-xs text-navy dark:text-cream/80 truncate shrink-0">{r.label}</span>
                      <div className="flex-1 bg-surface dark:bg-navy rounded-full h-1.5 overflow-hidden">
                        <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.max(r.pct, 4)}%` }} />
                      </div>
                      <span className="text-xs text-muted w-14 text-right shrink-0">{r.pct}% ({r.count})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Fila secundaria: Contacto + Prospección ── */}
      <div className="grid lg:grid-cols-5 gap-4 mb-4">

        {/* Contacto — 2 cols */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Contacto</CardTitle>
            <CardDescription>Conversión y tiempos</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 grid grid-cols-2 gap-3">
            <div className="bg-surface dark:bg-navy rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Conversión</p>
              <p className="text-2xl font-bold text-navy dark:text-cream">{pct(contactedCount, qualifiedCount)}</p>
              <p className="text-xs text-muted mt-1">calificado → contactado</p>
            </div>
            <div className="bg-surface dark:bg-navy rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Tiempo promedio</p>
              <p className="text-2xl font-bold text-navy dark:text-cream">{contactTime}</p>
              <p className="text-xs text-muted mt-1">desde calificación</p>
            </div>
          </CardContent>
        </Card>

        {/* Prospección — 3 cols */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Prospección</CardTitle>
            <CardDescription>Actividad del scraper en el período</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 grid grid-cols-3 gap-3">
            <div className="bg-surface dark:bg-navy rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Búsquedas</p>
              <p className="text-2xl font-bold text-brand">{searches.length}</p>
            </div>
            <div className="bg-surface dark:bg-navy rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Leads nuevos</p>
              <p className="text-2xl font-bold text-navy dark:text-cream">{foundCount}</p>
            </div>
            <div className="bg-surface dark:bg-navy rounded-xl p-3">
              <p className="text-xs text-muted mb-1">Prom. por búsqueda</p>
              <p className="text-2xl font-bold text-navy dark:text-cream">{avgNewLeads}</p>
            </div>
          </CardContent>
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
              ? <TableRow><TableCell colSpan={5} className="text-center text-muted py-10">Sin búsquedas en este período</TableCell></TableRow>
              : searches.map((s, i) => (
                <TableRow key={i}>
                  <TableCell className="text-navy dark:text-cream/80">{s.niche}</TableCell>
                  <TableCell className="text-navy dark:text-cream/80">{s.location}</TableCell>
                  <TableCell className="text-center text-muted">{s.results_found}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={s.new_leads > 0 ? 'success' : 'secondary'}>{s.new_leads}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted text-xs">
                    {new Date(s.ran_at).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })}
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </Card>

    </main>
  )
}
