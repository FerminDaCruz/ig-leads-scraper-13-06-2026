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
    totalRes,
    pendingRes,
    revisadosRes,
    calificadosRes,   // calificado=true (incluye los que luego fueron contactados)
    descartadosRes,   // calificado=false
    esperandoRes,     // calificado=true, contactado=false (cola actual)
    contactadosRes,
    reasonsRes,
    allLeadsRes,
    searchesTotalRes,
  ] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }),
    supabase.from('leads').select('id', { count: 'exact', head: true }).is('calificado', null),
    supabase.from('leads').select('id', { count: 'exact', head: true }).not('calificado', 'is', null),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', true),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', false),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', true).eq('contactado', false),
    supabase.from('leads').select('id', { count: 'exact', head: true }).eq('contactado', true),
    supabase.from('leads').select('descarte_razon').eq('calificado', false),
    supabase.from('leads').select('nichos, ubicaciones, calificado, contactado'),
    supabase.from('searches').select('id', { count: 'exact', head: true }),
  ])

  const total         = totalRes.count ?? 0
  const pending       = pendingRes.count ?? 0
  const revisados     = revisadosRes.count ?? 0
  const calificados   = calificadosRes.count ?? 0  // alguna vez calificados
  const descartados   = descartadosRes.count ?? 0
  const esperando     = esperandoRes.count ?? 0     // listos para contactar ahora
  const contactados   = contactadosRes.count ?? 0
  const totalSearches = searchesTotalRes.count ?? 0

  const reasonMap = (reasonsRes.data || []).reduce((acc, r) => {
    const k = r.descarte_razon || 'otro'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const reasonEntries = Object.entries(reasonMap)
    .map(([k, n]) => ({ label: RAZON_LABELS[k] || k, count: n, pct: descartados > 0 ? Math.round((n / descartados) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  const allLeads = (allLeadsRes.data || []) as { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean }[]
  const nichoStats     = buildGroupStats(allLeads, 'nichos')
  const ubicacionStats = buildGroupStats(allLeads, 'ubicaciones')

  // Funnel: todas las barras y % en base al total de la DB
  const funnelRows = [
    { label: 'Total en DB', n: total,       color: 'bg-brand',    pctOfDB: 100 },
    { label: 'Revisados',   n: revisados,   color: 'bg-brand/70', pctOfDB: total > 0 ? Math.round((revisados   / total) * 100) : 0 },
    { label: 'Calificados', n: calificados, color: 'bg-green-500', pctOfDB: total > 0 ? Math.round((calificados / total) * 100) : 0 },
    { label: 'Contactados', n: contactados, color: 'bg-green-700', pctOfDB: total > 0 ? Math.round((contactados / total) * 100) : 0 },
  ]

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Métricas</h1>
        <p className="text-muted text-sm mt-1">Datos históricos acumulados · todos los tiempos</p>
      </div>

      {/* ── Estado actual ── */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Estado actual</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        {[
          { label: 'Total en DB',       value: total,         sub: '100% de la DB',                           color: 'text-navy dark:text-cream' },
          { label: 'Sin revisar',       value: pending,       sub: `${pct(pending, total)} de la DB`,          color: 'text-muted' },
          { label: 'Revisados',         value: revisados,     sub: `${pct(revisados, total)} de la DB`,        color: 'text-navy dark:text-cream' },
          { label: 'Calificados',       value: calificados,   sub: `${pct(calificados, total)} de la DB`,      color: 'text-green-600 dark:text-green-400' },
          { label: 'Descartados',       value: descartados,   sub: `${pct(descartados, total)} de la DB`,      color: 'text-red-500 dark:text-red-400' },
          { label: 'Contactados',       value: contactados,   sub: `${pct(contactados, total)} de la DB`,      color: 'text-brand' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted mb-1.5">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
              <p className="text-xs text-muted mt-1.5">{c.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Embudo + Tasas ── */}
      <div className="grid lg:grid-cols-5 gap-4 mb-4">

        {/* Embudo — % todos sobre total en DB */}
        <Card className="lg:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle>Embudo histórico</CardTitle>
            <CardDescription>Todos los porcentajes calculados sobre el total en DB ({total} leads)</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 flex flex-col gap-5">
            {funnelRows.map((row) => (
              <div key={row.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-navy dark:text-cream">{row.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-navy dark:text-cream tnum">{row.n.toLocaleString('es-AR')}</span>
                    <span className="w-14 text-right font-bold text-foreground tnum">{row.pctOfDB}%</span>
                    <span className="hidden sm:inline text-xs text-muted w-20">de la DB</span>
                  </div>
                </div>
                <div className="w-full bg-surface dark:bg-navy rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${row.color} transition-all`}
                    style={{ width: `${Math.max(row.pctOfDB, 1)}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Tasas de conversión paso a paso */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle>Tasas de conversión</CardTitle>
            <CardDescription>Cada % calculado sobre el paso anterior</CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-2 flex flex-col gap-3">
            {[
              { label: 'Revisados',   value: pct(revisados,   total),       base: `de ${total.toLocaleString('es-AR')} en DB`,         color: 'text-navy dark:text-cream' },
              { label: 'Calificados', value: pct(calificados, revisados),    base: `de ${revisados.toLocaleString('es-AR')} revisados`,  color: 'text-green-600 dark:text-green-400' },
              { label: 'Descartados', value: pct(descartados, revisados),    base: `de ${revisados.toLocaleString('es-AR')} revisados`,  color: 'text-red-500 dark:text-red-400' },
              { label: 'Contactados', value: pct(contactados, calificados),  base: `de ${calificados.toLocaleString('es-AR')} calif.`,   color: 'text-brand' },
            ].map((t) => (
              <div key={t.label} className="bg-surface dark:bg-navy rounded-xl p-3 flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs text-muted">{t.label}</p>
                  <p className="text-xs text-muted/70 mt-0.5">{t.base}</p>
                </div>
                <p className={`text-2xl font-bold shrink-0 ${t.color}`}>{t.value}</p>
              </div>
            ))}

            <div className="bg-surface dark:bg-navy rounded-xl p-3 flex items-center justify-between gap-2">
              <div>
                <p className="text-xs text-muted">Esperando contacto</p>
                <p className="text-xs text-muted/70 mt-0.5">cola actual</p>
              </div>
              <p className="text-2xl font-bold text-navy dark:text-cream shrink-0">{esperando}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Motivos de descarte ── */}
      {reasonEntries.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Motivos de descarte</CardTitle>
            <CardDescription>% calculado sobre {descartados} leads descartados</CardDescription>
          </CardHeader>
          <CardContent className="p-5 pt-2 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reasonEntries.map((r) => (
              <div key={r.label} className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-navy dark:text-cream/80 truncate">{r.label}</span>
                  <span className="font-bold text-navy dark:text-cream shrink-0 ml-2">{r.count}</span>
                </div>
                <div className="w-full bg-surface dark:bg-navy rounded-full h-2 overflow-hidden">
                  <div className="h-full rounded-full bg-red-400" style={{ width: `${Math.max(r.pct, 4)}%` }} />
                </div>
                <p className="text-xs text-muted">{r.pct}% de los descartados</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* ── Tablas de rendimiento ── */}
      <div className="grid lg:grid-cols-2 gap-4">

        <Card className="overflow-x-auto">
          <CardHeader>
            <CardTitle>Mejores nichos</CardTitle>
            <CardDescription>% = calificados / total encontrados en ese nicho</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Nicho</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Calif.</TableHead>
                <TableHead className="text-center">Cont.</TableHead>
                <TableHead className="text-center">% calif.</TableHead>
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
            <CardDescription>% = calificados / total encontrados en esa ubicación</CardDescription>
          </CardHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-center">Total</TableHead>
                <TableHead className="text-center">Calif.</TableHead>
                <TableHead className="text-center">Cont.</TableHead>
                <TableHead className="text-center">% calif.</TableHead>
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

      {/* ── Pie: búsquedas ── */}
      <p className="text-xs text-muted mt-6 text-center">
        Búsquedas totales registradas: <span className="font-semibold text-navy dark:text-cream">{totalSearches.toLocaleString('es-AR')}</span>
      </p>

    </main>
  )
}
