export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { ETAPAS } from '@/lib/pipeline-stages'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

// ── Helpers ───────────────────────────────────────────────────────────────────
function pct(a: number, b: number) {
  return b === 0 ? '—' : `${Math.round((a / b) * 100)}%`
}
function parseList(t: string) {
  return (t || '').split(',').map((s) => s.trim()).filter(Boolean)
}

const RAZON_LABELS: Record<string, string> = {
  ya_tiene_web: 'Ya tiene web',
  inactivo: 'Inactivo',
  no_es_alojamiento: 'No es alojamiento',
  pocos_seguidores: 'Pocos seguidores',
  perfil_no_encontrado: 'Perfil no encontrado',
  otro: 'Otro',
}

const AR_TZ = 'America/Argentina/Buenos_Aires'
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
function monthLabel(key: string) {
  const [y, m] = key.split('-').map(Number)
  return new Intl.DateTimeFormat('es-AR', { month: 'short', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(Date.UTC(y, m - 1, 1)))
}
function monthRange(mes: string) {
  const [y, m] = mes.split('-').map(Number)
  const start = `${mes}-01T00:00:00-03:00`
  const nm = m === 12 ? 1 : m + 1
  const ny = m === 12 ? y + 1 : y
  return { start, end: `${ny}-${String(nm).padStart(2, '0')}-01T00:00:00-03:00` }
}

// Etapas >= la dada (para contar "alcanzó esta etapa" por etapa actual)
const reachedFrom = (etapa: string) => ETAPAS.slice((ETAPAS as readonly string[]).indexOf(etapa))

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
    .filter((s) => s.total >= 2)
    .sort((a, b) => b.rate - a.rate)
    .slice(0, 15)
}

const FUNNEL = [
  { label: 'Iniciados', etapa: 'iniciado', dateCol: 'contacted_at', color: 'bg-brand' },
  { label: 'Vistos', etapa: 'visto', dateCol: 'visto_at', color: 'bg-brand/80' },
  { label: 'Interesados', etapa: 'interesado', dateCol: 'interesado_at', color: 'bg-green-500' },
  { label: 'Calendly enviados', etapa: 'calendly_enviado', dateCol: 'calendly_at', color: 'bg-green-600' },
  { label: 'Agendados', etapa: 'agendado', dateCol: 'agendado_at', color: 'bg-green-700' },
  { label: 'Cerrados', etapa: 'cerrado', dateCol: 'cerrado_at', color: 'bg-emerald-800' },
]

// Metas (KPI) como % sobre iniciados. Iniciados es la base (sin meta).
const KPI_INICIADOS: Record<string, number | null> = {
  iniciado: null,
  visto: 30,
  interesado: 6,
  calendly_enviado: 3,
  agendado: 2,
  cerrado: 1,
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  const { mes } = await searchParams
  const esMes = !!mes && /^\d{4}-\d{2}$/.test(mes)
  const range = esMes ? monthRange(mes!) : null
  const supabase = getSupabase()

  // Conteos del funnel (por etapa alcanzada si "Todos"; por fecha en el mes si hay mes)
  const funnelCounts = await Promise.all(
    FUNNEL.map(async (s) => {
      let q = supabase.from('leads').select('id', { count: 'exact', head: true })
      if (range) q = q.gte(s.dateCol, range.start).lt(s.dateCol, range.end)
      else q = q.in('etapa', reachedFrom(s.etapa))
      const { count } = await q
      return count || 0
    })
  )

  // Overview + datos para tablas / heatmap
  const [totalRes, pendingRes, calRes, descRes, reasonsRes, allLeadsRes, searchesRes, iniciadosRes] =
    await Promise.all([
      supabase.from('leads').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('id', { count: 'exact', head: true }).is('calificado', null),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', true),
      supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', false),
      supabase.from('leads').select('descarte_razon').eq('calificado', false),
      supabase.from('leads').select('nichos, ubicaciones, calificado, contactado'),
      supabase.from('searches').select('id', { count: 'exact', head: true }),
      supabase.from('leads').select('contacted_at').not('contacted_at', 'is', null),
    ])

  const total = totalRes.count ?? 0
  const sinCalificar = pendingRes.count ?? 0
  const calificados = calRes.count ?? 0
  const descartados = descRes.count ?? 0
  const totalSearches = searchesRes.count ?? 0

  const reasonMap = (reasonsRes.data || []).reduce((acc, r) => {
    const k = r.descarte_razon || 'otro'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const reasonEntries = Object.entries(reasonMap)
    .map(([k, n]) => ({ label: RAZON_LABELS[k] || k, count: n, pct: descartados > 0 ? Math.round((n / descartados) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  const allLeads = (allLeadsRes.data || []) as { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean }[]
  const nichoStats = buildGroupStats(allLeads, 'nichos')
  const ubicacionStats = buildGroupStats(allLeads, 'ubicaciones')

  // ── Heatmap: iniciados por día/mes (siempre histórico completo) ──
  const iniciados = (iniciadosRes.data || []) as { contacted_at: string }[]
  const grid = new Map<string, Map<number, number>>() // monthKey -> day -> count
  for (const r of iniciados) {
    const iso = dayFmt.format(new Date(r.contacted_at)) // YYYY-MM-DD (ART)
    const monthKey = iso.slice(0, 7)
    const day = Number(iso.slice(8, 10))
    if (!grid.has(monthKey)) grid.set(monthKey, new Map())
    const dm = grid.get(monthKey)!
    dm.set(day, (dm.get(day) || 0) + 1)
  }
  const monthsPresent = Array.from(grid.keys()).sort()
  const maxDaily = Math.max(1, ...Array.from(grid.values()).flatMap((dm) => Array.from(dm.values())))
  const monthTotals = new Map(monthsPresent.map((mk) => [mk, Array.from(grid.get(mk)!.values()).reduce((a, b) => a + b, 0)]))

  // Fecha actual (ART) para "día de hoy" y días transcurridos
  const todayISO = dayFmt.format(new Date()) // YYYY-MM-DD
  const currentMonthKey = todayISO.slice(0, 7)
  const curD = Number(todayISO.slice(8, 10))
  // Columnas del calendario: meses con datos + el mes en curso
  const months = Array.from(new Set([...monthsPresent, currentMonthKey])).sort()
  const daysInMonth = (mk: string) => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate() }
  const elapsedDays = (mk: string) => (mk < currentMonthKey ? daysInMonth(mk) : mk === currentMonthKey ? curD : 0)
  // Promedios por mes
  const promProsp = (mk: string) => { const t = monthTotals.get(mk) || 0; const d = grid.get(mk)?.size || 0; return d > 0 ? (t / d).toFixed(1) : '—' }
  const promDia = (mk: string) => { const t = monthTotals.get(mk) || 0; const e = elapsedDays(mk); return e > 0 ? (t / e).toFixed(1) : '—' }

  // Opciones del filtro de mes
  const mesOptions = months

  const iniciadosBase = funnelCounts[0] // para % sobre iniciados

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Métricas</h1>
        <p className="text-muted text-sm mt-1">Embudo por etapas · {esMes ? monthLabel(mes!) : 'histórico completo'}</p>
      </div>

      {/* Filtro por mes */}
      <div className="flex gap-2 mb-6 overflow-x-auto -mx-4 px-4 pb-1">
        {[{ key: '', label: 'Todos' }, ...mesOptions.map((m) => ({ key: m, label: monthLabel(m) }))].map((o) => {
          const active = o.key === (esMes ? mes : '')
          return (
            <Link
              key={o.key || 'todos'}
              href={o.key ? `/metricas?mes=${o.key}` : '/metricas'}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {o.label}
            </Link>
          )
        })}
      </div>

      {/* Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total en DB', value: total, color: 'text-navy dark:text-cream' },
          { label: 'Sin calificar', value: sinCalificar, color: 'text-muted' },
          { label: 'Calificados', value: calificados, color: 'text-green-600 dark:text-green-400' },
          { label: 'Descartados', value: descartados, color: 'text-red-500 dark:text-red-400' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted mb-1.5">{c.label}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.value.toLocaleString('es-AR')}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Embudo de etapas — cuadro con KPIs */}
      <Card className="mb-4 overflow-x-auto">
        <CardHeader className="pb-2">
          <CardTitle>Embudo de etapas {esMes && <span className="capitalize font-normal text-muted">· {monthLabel(mes!)}</span>}</CardTitle>
          <CardDescription>
            {esMes ? 'Entraron a cada etapa durante el mes' : 'Alcanzaron cada etapa (histórico)'} · % sobre Iniciados vs. meta (KPI)
          </CardDescription>
        </CardHeader>
        <Table className="min-w-[460px]">
          <TableHeader>
            <TableRow>
              <TableHead>Etapa</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">% s/ iniciados</TableHead>
              <TableHead className="text-center">Meta</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FUNNEL.map((s, i) => {
              const n = funnelCounts[i]
              const p = iniciadosBase > 0 ? Math.round((n / iniciadosBase) * 100) : 0
              const kpi = KPI_INICIADOS[s.etapa]
              const meets = kpi == null ? null : p >= kpi
              return (
                <TableRow key={s.label}>
                  <TableCell className="font-medium text-navy dark:text-cream">{s.label}</TableCell>
                  <TableCell className="text-center font-bold text-navy dark:text-cream tnum">{n.toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold tnum ${meets === null ? 'text-foreground' : meets ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {i === 0 ? '100%' : `${p}%`}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted tnum">{kpi == null ? '—' : `≥${kpi}%`}</TableCell>
                  <TableCell className="text-center">
                    {meets === null ? (
                      <span className="text-muted">—</span>
                    ) : (
                      <Badge variant={meets ? 'success' : 'destructive'}>{meets ? '✓ Cumple' : '✗ No cumple'}</Badge>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Calendario: iniciados por día/mes */}
      <Card className="mb-4 overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle>Iniciados por día</CardTitle>
          <CardDescription>Cantidad de leads iniciados cada día · el mes en curso y el día de hoy están resaltados</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2">
          {iniciados.length === 0 ? (
            <p className="text-sm text-muted py-4">Todavía no hay iniciados con fecha.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-collapse text-xs tnum">
                <thead>
                  <tr>
                    <th className="sticky left-0 z-10 bg-card border border-border px-2.5 py-1.5 text-left text-muted font-semibold">Día</th>
                    {months.map((mk) => (
                      <th
                        key={mk}
                        className={`border border-border px-2 py-1.5 text-center font-semibold capitalize min-w-[3.5rem] ${
                          mk === currentMonthKey ? 'bg-foreground text-background' : 'bg-foreground/[0.06] text-navy dark:text-cream'
                        }`}
                      >
                        {monthLabel(mk)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 31 }, (_, d) => d + 1).map((day) => (
                    <tr key={day}>
                      <td className={`sticky left-0 z-10 bg-card border border-border px-2.5 py-1 text-center text-muted ${day === curD ? 'font-bold text-foreground' : ''}`}>
                        {day}
                      </td>
                      {months.map((mk) => {
                        const n = grid.get(mk)?.get(day) || 0
                        const ratio = n / maxDaily
                        const hoy = day === curD && mk === currentMonthKey
                        const valido = day <= daysInMonth(mk)
                        return (
                          <td
                            key={mk}
                            className={`border border-border text-center px-2 py-1 ${hoy ? 'ring-2 ring-inset ring-foreground font-bold' : ''} ${!valido ? 'bg-foreground/[0.03]' : ''}`}
                            style={{
                              backgroundColor: n > 0 ? `rgba(34,197,94,${(0.18 + 0.82 * ratio).toFixed(3)})` : undefined,
                              color: ratio > 0.55 ? 'white' : undefined,
                            }}
                            title={valido ? `${day} ${monthLabel(mk)}: ${n} iniciados` : undefined}
                          >
                            {n || ''}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="sticky left-0 z-10 bg-card border border-border px-2.5 py-1.5 font-bold text-navy dark:text-cream">Total</td>
                    {months.map((mk) => (
                      <td key={mk} className="border border-border text-center px-2 py-1.5 font-bold text-navy dark:text-cream">{monthTotals.get(mk) || 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-10 bg-card border border-border px-2.5 py-1 text-muted text-[0.7rem]">Prom. días prosp.</td>
                    {months.map((mk) => (
                      <td key={mk} className="border border-border text-center px-2 py-1 text-muted">{promProsp(mk)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-10 bg-card border border-border px-2.5 py-1 text-muted text-[0.7rem]">Prom. diario (transcurrido)</td>
                    {months.map((mk) => (
                      <td key={mk} className="border border-border text-center px-2 py-1 text-muted">{promDia(mk)}</td>
                    ))}
                  </tr>
                </tfoot>
              </table>
              <p className="text-xs text-muted mt-3">
                <span className="font-medium">Prom. días prosp.</span>: promedio contando solo los días que prospectaste ·{' '}
                <span className="font-medium">Prom. diario</span>: sobre todos los días transcurridos del mes.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Motivos de descarte */}
      {reasonEntries.length > 0 && (
        <Card className="mb-4">
          <CardHeader className="pb-2">
            <CardTitle>Motivos de descarte</CardTitle>
            <CardDescription>% sobre {descartados} leads descartados (histórico)</CardDescription>
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

      {/* Tablas de rendimiento */}
      <div className="grid lg:grid-cols-2 gap-4">
        {([
          { title: 'Mejores nichos', head: 'Nicho', stats: nichoStats },
          { title: 'Mejores ubicaciones', head: 'Ubicación', stats: ubicacionStats },
        ] as const).map((t) => (
          <Card key={t.title} className="overflow-x-auto">
            <CardHeader>
              <CardTitle>{t.title}</CardTitle>
              <CardDescription>% = calificados / total encontrados</CardDescription>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>{t.head}</TableHead>
                  <TableHead className="text-center">Total</TableHead>
                  <TableHead className="text-center">Calif.</TableHead>
                  <TableHead className="text-center">Cont.</TableHead>
                  <TableHead className="text-center">% calif.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {t.stats.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted py-8">Sin datos suficientes</TableCell></TableRow>
                ) : (
                  t.stats.map((s, i) => (
                    <TableRow key={s.name}>
                      <TableCell className="text-muted text-xs w-6">{i + 1}</TableCell>
                      <TableCell className="text-navy dark:text-cream/80 max-w-[150px] truncate">{s.name}</TableCell>
                      <TableCell className="text-center text-muted">{s.total}</TableCell>
                      <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                      <TableCell className="text-center text-brand font-medium">{s.contactados}</TableCell>
                      <TableCell className="text-center"><Badge>{s.rate}%</Badge></TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        ))}
      </div>

      <p className="text-xs text-muted mt-6 text-center">
        Búsquedas totales registradas: <span className="font-semibold text-navy dark:text-cream">{totalSearches.toLocaleString('es-AR')}</span>
      </p>
    </main>
  )
}
