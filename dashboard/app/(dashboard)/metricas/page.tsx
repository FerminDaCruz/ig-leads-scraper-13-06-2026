export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  return b === 0 ? '—' : `${Math.round((a / b) * 100)}%`
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

interface GroupStat { name: string; total: number; calificados: number; contactados: number; rate: number }

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
    .map(([name, s]) => ({ name, ...s, rate: s.total > 0 ? Math.round((s.calificados / s.total) * 100) : 0 }))
    .filter(s => s.total >= 2)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 15)
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function MetricasPage() {
  const supabase = getSupabase()

  const [
    totalRes, pendingRes, qualRes, contRes,
    reasonsRes,
    allLeadsRes,
    searchesTotalRes,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).is('calificado', null),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('contactado', true),
    supabase.from('leads').select('descarte_razon').eq('calificado', false),
    supabase.from('leads').select('nichos, ubicaciones, calificado, contactado'),
    supabase.from('searches').select('id', { count: 'exact', head: true }),
  ])

  const total        = totalRes.count ?? 0
  const pending      = pendingRes.count ?? 0
  const calificados  = qualRes.count ?? 0
  const contactados  = contRes.count ?? 0
  const descartados  = total - pending - calificados - contactados
  const revisados    = total - pending

  const reasonMap = (reasonsRes.data || []).reduce((acc, r) => {
    const k = r.descarte_razon || 'otro'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const reasonEntries = Object.entries(reasonMap)
    .map(([k, n]) => ({ label: RAZON_LABELS[k] || k, count: n, pct: descartados > 0 ? Math.round((n / descartados) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  const allLeads = (allLeadsRes.data || []) as { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean }[]
  const nichoStats    = buildGroupStats(allLeads, 'nichos')
  const ubicacionStats = buildGroupStats(allLeads, 'ubicaciones')

  const totalSearches = searchesTotalRes.count ?? 0

  const funnelRows = [
    { label: 'Total en DB',   n: total,       base: total,      color: 'bg-brand' },
    { label: 'Revisados',     n: revisados,   base: total,      color: 'bg-brand/70' },
    { label: 'Calificados',   n: calificados, base: revisados,  color: 'bg-green-500' },
    { label: 'Contactados',   n: contactados, base: calificados, color: 'bg-green-700' },
  ]

  return (
    <main className="max-w-7xl mx-auto px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Métricas</h1>
        <p className="text-muted text-sm mt-1">Datos históricos acumulados · todos los tiempos</p>
      </div>

      {/* ── Estado actual ── */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Estado actual</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total en DB',        value: total,         color: 'text-navy dark:text-cream' },
          { label: 'Sin revisar',        value: pending,       color: 'text-muted' },
          { label: 'Calificados',        value: calificados,   color: 'text-green-600 dark:text-green-400' },
          { label: 'Descartados',        value: descartados,   color: 'text-red-500 dark:text-red-400' },
          { label: 'Contactados',        value: contactados,   color: 'text-brand' },
          { label: 'Búsquedas totales',  value: totalSearches, color: 'text-navy dark:text-cream' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted mb-1.5">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Fila: Embudo + Tasas ── */}
      <div className="grid lg:grid-cols-5 gap-4 mb-4">

        {/* Embudo histórico */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Embudo histórico</CardTitle>
            <CardDescription>Conversión acumulada de todos los leads</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 flex flex-col gap-4">
            {funnelRows.map((row) => {
              const p = row.base > 0 ? Math.round((row.n / row.base) * 100) : 0
              return (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="w-24 text-sm text-muted text-right shrink-0">{row.label}</span>
                  <div className="flex-1 bg-surface dark:bg-navy rounded-full h-3 overflow-hidden">
                    <div className={`h-full rounded-full ${row.color}`} style={{ width: `${Math.max(p, 1)}%` }} />
                  </div>
                  <span className="w-8 text-sm font-bold text-navy dark:text-cream text-right shrink-0">{row.n}</span>
                  <span className="w-10 text-xs text-muted text-right shrink-0">{p}%</span>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Tasas globales */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Tasas globales</CardTitle>
            <CardDescription>Sobre el total histórico</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Revisión</p>
                <p className="text-2xl font-bold text-navy dark:text-cream">{pct(revisados, total)}</p>
                <p className="text-xs text-muted mt-1">leads revisados</p>
              </div>
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Calificación</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{pct(calificados, revisados)}</p>
                <p className="text-xs text-muted mt-1">de revisados</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Descarte</p>
                <p className="text-2xl font-bold text-red-500 dark:text-red-400">{pct(descartados, revisados)}</p>
                <p className="text-xs text-muted mt-1">de revisados</p>
              </div>
              <div className="bg-surface dark:bg-navy rounded-xl p-3">
                <p className="text-xs text-muted mb-1">Contacto</p>
                <p className="text-2xl font-bold text-brand">{pct(contactados, calificados)}</p>
                <p className="text-xs text-muted mt-1">de calificados</p>
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

      {/* ── Tablas de rendimiento ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Mejores nichos</CardTitle>
            <CardDescription>Por % de calificación · mín. 2 leads</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Calif.</TableHead>
                <TableHead className="text-center">Cont.</TableHead>
                <TableHead className="text-center">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {nichoStats.length === 0
                ? <TableRow><TableCell colSpan={6} className="text-center text-muted py-8">Sin datos suficientes</TableCell></TableRow>
                : nichoStats.map((s, i) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-muted text-xs w-6">{i + 1}</TableCell>
                    <TableCell className="text-navy dark:text-cream/80 max-w-[150px] truncate">{s.name}</TableCell>
                    <TableCell className="text-center text-muted">{s.total}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                    <TableCell className="text-center text-brand font-medium">{s.contactados}</TableCell>
                    <TableCell className="text-center"><Badge>{s.rate}%</Badge></TableCell>
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
                <TableHead>#</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Calif.</TableHead>
                <TableHead className="text-center">Cont.</TableHead>
                <TableHead className="text-center">%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ubicacionStats.length === 0
                ? <TableRow><TableCell colSpan={6} className="text-center text-muted py-8">Sin datos suficientes</TableCell></TableRow>
                : ubicacionStats.map((s, i) => (
                  <TableRow key={s.name}>
                    <TableCell className="text-muted text-xs w-6">{i + 1}</TableCell>
                    <TableCell className="text-navy dark:text-cream/80 max-w-[150px] truncate">{s.name}</TableCell>
                    <TableCell className="text-center text-muted">{s.total}</TableCell>
                    <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                    <TableCell className="text-center text-brand font-medium">{s.contactados}</TableCell>
                    <TableCell className="text-center"><Badge>{s.rate}%</Badge></TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </Card>

      </div>
    </main>
  )
}
