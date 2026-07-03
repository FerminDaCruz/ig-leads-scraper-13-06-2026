export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { ETAPAS, DEFAULT_KPIS, KPI_ETAPAS, kpiEsNumero } from '@/lib/pipeline-stages'
import { CopyReport } from '@/components/CopyReport'
import { KpiConfig } from '@/components/metricas/KpiConfig'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

// ── Helpers ───────────────────────────────────────────────────────────────────
// Porcentaje sin redondear a entero: hasta 1 decimal (ej. 13,5% · 20,8%).
const fmtPct = (v: number) => `${v.toLocaleString('es-AR', { maximumFractionDigits: 1 })}%`
const fmtNum = (v: number) => v.toLocaleString('es-AR', { maximumFractionDigits: 1 })
function avgDays(pairs: { a: string | null; b: string | null }[]): string {
  const diffs = pairs
    .filter((p) => p.a && p.b)
    .map((p) => (new Date(p.b!).getTime() - new Date(p.a!).getTime()) / 86400000)
  if (diffs.length === 0) return '—'
  const avg = diffs.reduce((s, d) => s + d, 0) / diffs.length
  return avg < 1 ? '< 1 día' : `${Math.round(avg * 10) / 10} días`
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
const daysInMonth = (mk: string) => { const [y, m] = mk.split('-').map(Number); return new Date(y, m, 0).getDate() }

// Etapas >= la dada (para contar "alcanzó esta etapa" por etapa actual)
const reachedFrom = (etapa: string) => ETAPAS.slice((ETAPAS as readonly string[]).indexOf(etapa))

// Embudo con los nombres de cada métrica (A es la base = iniciados).
const FUNNEL = [
  { code: 'A', label: 'Iniciados', sub: 'Mensajes enviados (base)', etapa: 'iniciado', dateCol: 'contacted_at' },
  { code: 'OP', label: 'Tasa de apertura de mensajes', sub: '% de AV sobre A', etapa: 'visto', dateCol: 'visto_at' },
  { code: 'PRR', label: 'Tasa de respuesta positiva', sub: '% de VE sobre A', etapa: 'interesado', dateCol: 'interesado_at' },
  { code: 'CSR', label: 'Tasa de calendly enviados', sub: '% de C sobre A', etapa: 'calendly_enviado', dateCol: 'calendly_at' },
  { code: 'ABR', label: 'Tasa de agendas', sub: '% de D sobre A', etapa: 'agendado', dateCol: 'agendado_at' },
  { code: 'CR', label: 'Tasa de cierre', sub: '% de E sobre A', etapa: 'cerrado', dateCol: 'cerrado_at' },
]

const VISTAS = [
  { key: 'mes', label: 'Mes' },
  { key: 'dia', label: 'Día' },
  { key: 'semana', label: 'Semana' },
] as const
type Vista = (typeof VISTAS)[number]['key']

// ── Page ──────────────────────────────────────────────────────────────────────
export default async function MetricasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; vista?: string }>
}) {
  const { mes: mesParam, vista: vistaParam } = await searchParams
  const supabase = getSupabase()

  // Fecha actual (ART).
  const todayISO = dayFmt.format(new Date())
  const currentMonthKey = todayISO.slice(0, 7)
  const curD = Number(todayISO.slice(8, 10))

  // Por defecto: mes actual. 'todos' = histórico completo.
  const esTodos = mesParam === 'todos'
  const mes = esTodos ? null : mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : currentMonthKey
  const esMes = !esTodos
  const vista: Vista = esMes && (vistaParam === 'dia' || vistaParam === 'semana') ? vistaParam : 'mes'
  const range = mes ? monthRange(mes) : null

  // Prorrateo de valores absolutos según la vista (día/semana). Las tasas (%) no se prorratean.
  const divisor = mes ? (vista === 'dia' ? daysInMonth(mes) : vista === 'semana' ? daysInMonth(mes) / 7 : 1) : 1
  const prorate = (v: number) => v / divisor
  const unidad = vista === 'dia' ? '/día' : vista === 'semana' ? '/sem' : ''

  // Metas (KPI) del mes; en "Todos" se usan los valores por defecto.
  const kpiMap: Record<string, number> = { ...DEFAULT_KPIS }
  if (esMes && mes) {
    const { data: kpiRows } = await supabase.from('kpis').select('etapa, valor').eq('mes', mes)
    for (const r of (kpiRows || []) as { etapa: string; valor: number }[]) {
      if (KPI_ETAPAS.includes(r.etapa)) kpiMap[r.etapa] = Number(r.valor)
    }
  }

  // Conteos del funnel (por fecha en el mes; por etapa alcanzada en "Todos").
  const funnelCounts = await Promise.all(
    FUNNEL.map(async (s) => {
      let q = supabase.from('leads').select('id', { count: 'exact', head: true })
      if (range) q = q.gte(s.dateCol, range.start).lt(s.dateCol, range.end)
      else q = q.in('etapa', reachedFrom(s.etapa))
      const { count } = await q
      return count || 0
    })
  )

  // Actividad del período + datos para heatmap / motivos / tiempos.
  const encontradosQ = range
    ? supabase.from('leads').select('id', { count: 'exact', head: true }).gte('first_seen_at', range.start).lt('first_seen_at', range.end)
    : supabase.from('leads').select('id', { count: 'exact', head: true })
  const calificadosQ = range
    ? supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', true).gte('qualified_at', range.start).lt('qualified_at', range.end)
    : supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', true)
  const descartadosQ = range
    ? supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', false).gte('qualified_at', range.start).lt('qualified_at', range.end)
    : supabase.from('leads').select('id', { count: 'exact', head: true }).eq('calificado', false)
  const reviewTimeQ = range
    ? supabase.from('leads').select('first_seen_at, qualified_at').not('qualified_at', 'is', null).gte('qualified_at', range.start).lt('qualified_at', range.end)
    : supabase.from('leads').select('first_seen_at, qualified_at').not('qualified_at', 'is', null)
  const contactTimeQ = range
    ? supabase.from('leads').select('qualified_at, contacted_at').not('contacted_at', 'is', null).gte('contacted_at', range.start).lt('contacted_at', range.end)
    : supabase.from('leads').select('qualified_at, contacted_at').not('contacted_at', 'is', null)

  const [encontradosRes, calificadosRes, descartadosRes, reasonsRes, reviewTimeRes, contactTimeRes, iniciadosRes] =
    await Promise.all([
      encontradosQ,
      calificadosQ,
      descartadosQ,
      supabase.from('leads').select('descarte_razon').eq('calificado', false),
      reviewTimeQ,
      contactTimeQ,
      supabase.from('leads').select('contacted_at').not('contacted_at', 'is', null),
    ])

  const encontrados = encontradosRes.count ?? 0
  const calificados = calificadosRes.count ?? 0
  const descartados = descartadosRes.count ?? 0
  const descartadosTotal = (reasonsRes.data || []).length

  const reasonMap = (reasonsRes.data || []).reduce((acc, r) => {
    const k = r.descarte_razon || 'otro'
    acc[k] = (acc[k] || 0) + 1
    return acc
  }, {} as Record<string, number>)
  const reasonEntries = Object.entries(reasonMap)
    .map(([k, n]) => ({ label: RAZON_LABELS[k] || k, count: n, pct: descartadosTotal > 0 ? Math.round((n / descartadosTotal) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)

  const reviewTime = avgDays((reviewTimeRes.data || []).map((r) => ({ a: r.first_seen_at, b: r.qualified_at })))
  const contactTime = avgDays((contactTimeRes.data || []).map((r) => ({ a: r.qualified_at, b: r.contacted_at })))

  // ── Heatmap: iniciados por día/mes (siempre histórico completo) ──
  const iniciados = (iniciadosRes.data || []) as { contacted_at: string }[]
  const grid = new Map<string, Map<number, number>>()
  for (const r of iniciados) {
    const iso = dayFmt.format(new Date(r.contacted_at))
    const monthKey = iso.slice(0, 7)
    const day = Number(iso.slice(8, 10))
    if (!grid.has(monthKey)) grid.set(monthKey, new Map())
    const dm = grid.get(monthKey)!
    dm.set(day, (dm.get(day) || 0) + 1)
  }
  const monthsPresent = Array.from(grid.keys()).sort()
  const maxDaily = Math.max(1, ...Array.from(grid.values()).flatMap((dm) => Array.from(dm.values())))
  const monthTotals = new Map(monthsPresent.map((mk) => [mk, Array.from(grid.get(mk)!.values()).reduce((a, b) => a + b, 0)]))
  const calMonths = Array.from(new Set([...monthsPresent, currentMonthKey])).sort()
  const elapsedDays = (mk: string) => (mk < currentMonthKey ? daysInMonth(mk) : mk === currentMonthKey ? curD : 0)
  const promProsp = (mk: string) => { const t = monthTotals.get(mk) || 0; const d = grid.get(mk)?.size || 0; return d > 0 ? (t / d).toFixed(1) : '—' }
  const promDia = (mk: string) => { const t = monthTotals.get(mk) || 0; const e = elapsedDays(mk); return e > 0 ? (t / e).toFixed(1) : '—' }

  // Opciones del filtro de mes
  const monthOptions = Array.from(new Set([...monthsPresent, currentMonthKey])).sort().reverse()

  const iniciadosBase = funnelCounts[0]
  const vistaLabel = esTodos ? 'histórico completo' : `${monthLabel(mes!)}${vista !== 'mes' ? ` · por ${vista === 'dia' ? 'día' : 'semana'}` : ''}`

  // ── Texto del reporte (Copiar) — totales del período ──
  const reporteTexto = `=== MÉTRICAS — IG LEADS ===
Vista: ${vistaLabel}

ACTIVIDAD (${esTodos ? 'histórico' : 'del mes'})
- Encontrados: ${encontrados}  |  Calificados: ${calificados}  |  Descartados: ${descartados}

EMBUDO DE ETAPAS (${esMes ? 'entraron en el mes' : 'alcanzaron la etapa'})
${FUNNEL.map((s, i) => {
  const n = funnelCounts[i]
  const p = iniciadosBase > 0 ? (n / iniciadosBase) * 100 : 0
  const kpi = kpiMap[s.etapa]
  const esNum = kpiEsNumero(s.etapa)
  const meets = esNum ? n >= kpi : p >= kpi
  const meta = esNum ? `meta ≥${kpi}` : `meta ≥${kpi}%`
  const nombre = i === 0 ? 'A · Iniciados' : `${s.code} · ${s.label}`
  return `- ${nombre}: ${n} (${i === 0 ? '100%' : fmtPct(p)} s/ A)  ${meta}  ${meets ? '✓' : '✗'}`
}).join('\n')}

TIEMPOS PROMEDIO
- Descubrimiento → revisión: ${reviewTime}
- Calificación → contacto: ${contactTime}

MOTIVOS DE DESCARTE
${reasonEntries.map((r) => `- ${r.label}: ${r.count} (${r.pct}%)`).join('\n') || '- Sin datos'}
`

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-cream">Métricas</h1>
          <p className="text-muted text-sm mt-1 capitalize">{vistaLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          {esMes && vista === 'mes' && mes && (
            <KpiConfig mes={mes} mesLabel={monthLabel(mes)} valores={kpiMap} />
          )}
          <CopyReport text={reporteTexto} />
        </div>
      </div>

      {/* Filtro por mes */}
      <div className="flex gap-2 mb-3 overflow-x-auto -mx-4 px-4 pb-1">
        {[{ key: 'todos', label: 'Todos' }, ...monthOptions.map((m) => ({ key: m, label: monthLabel(m) }))].map((o) => {
          const active = o.key === (esTodos ? 'todos' : mes)
          return (
            <Link
              key={o.key}
              href={`/metricas?mes=${o.key}`}
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

      {/* Sub-vista día / semana (solo con un mes seleccionado) */}
      {esMes && mes && (
        <div className="flex gap-2 mb-6">
          {VISTAS.map((v) => {
            const active = vista === v.key
            return (
              <Link
                key={v.key}
                href={`/metricas?mes=${mes}&vista=${v.key}`}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                {v.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Actividad del período (Scraper → yo) */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: 'Encontrados', value: encontrados, hint: 'perfiles del scraper', color: 'text-brand' },
          { label: 'Calificados', value: calificados, hint: 'los pasé a lead', color: 'text-green-600 dark:text-green-400' },
          { label: 'Descartados', value: descartados, hint: 'los descarté', color: 'text-red-500 dark:text-red-400' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted mb-1.5">{c.label} <span className="opacity-70">{unidad}</span></p>
              <p className={`text-3xl font-bold ${c.color}`}>{fmtNum(prorate(c.value))}</p>
              <p className="text-xs text-muted mt-1.5">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Embudo de etapas — cuadro con KPIs */}
      <Card className="mb-4 overflow-x-auto">
        <CardHeader className="pb-2">
          <CardTitle>Embudo de etapas</CardTitle>
          <CardDescription>
            Total {unidad || 'del período'} · % s/ A (Iniciados) — la tasa no cambia por día/semana; solo se prorratean los totales y la meta de A
          </CardDescription>
        </CardHeader>
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-center">Total{unidad}</TableHead>
              <TableHead className="text-center">% s/ A</TableHead>
              <TableHead className="text-center">Meta</TableHead>
              <TableHead className="text-center">Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FUNNEL.map((s, i) => {
              const n = funnelCounts[i]
              const p = iniciadosBase > 0 ? (n / iniciadosBase) * 100 : 0
              const esNum = kpiEsNumero(s.etapa)
              const kpi = kpiMap[s.etapa]
              const meets = esNum ? n >= kpi : p >= kpi
              return (
                <TableRow key={s.code}>
                  <TableCell>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-navy dark:text-cream">{s.code}</span>
                      <span className="text-sm text-navy dark:text-cream/80">{s.label}</span>
                    </div>
                    <span className="text-xs text-muted">{s.sub}</span>
                  </TableCell>
                  <TableCell className="text-center font-bold text-navy dark:text-cream tnum">{fmtNum(prorate(n))}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold tnum ${esNum ? 'text-foreground' : meets ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                      {i === 0 ? '100%' : fmtPct(p)}
                    </span>
                  </TableCell>
                  <TableCell className="text-center text-muted tnum">{esNum ? `≥${fmtNum(prorate(kpi))}` : `≥${kpi}%`}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={meets ? 'success' : 'destructive'}>{meets ? '✓ Cumple' : '✗ No cumple'}</Badge>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>

      {/* Tiempos promedio */}
      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle>Tiempos promedio {esMes && <span className="capitalize font-normal text-muted">· {monthLabel(mes!)}</span>}</CardTitle>
          <CardDescription>Velocidad de revisión y de contacto</CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-2 grid grid-cols-2 gap-3">
          <div className="bg-surface dark:bg-navy rounded-xl p-3">
            <p className="text-xs text-muted mb-1">Descubrimiento → revisión</p>
            <p className="text-2xl font-bold text-navy dark:text-cream">{reviewTime}</p>
            <p className="text-xs text-muted mt-1">desde que aparece hasta calificarlo</p>
          </div>
          <div className="bg-surface dark:bg-navy rounded-xl p-3">
            <p className="text-xs text-muted mb-1">Calificación → contacto</p>
            <p className="text-2xl font-bold text-navy dark:text-cream">{contactTime}</p>
            <p className="text-xs text-muted mt-1">desde calificar hasta iniciar</p>
          </div>
        </CardContent>
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
                    {calMonths.map((mk) => (
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
                      {calMonths.map((mk) => {
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
                    {calMonths.map((mk) => (
                      <td key={mk} className="border border-border text-center px-2 py-1.5 font-bold text-navy dark:text-cream">{monthTotals.get(mk) || 0}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-10 bg-card border border-border px-2.5 py-1 text-muted text-[0.7rem]">Prom. días prosp.</td>
                    {calMonths.map((mk) => (
                      <td key={mk} className="border border-border text-center px-2 py-1 text-muted">{promProsp(mk)}</td>
                    ))}
                  </tr>
                  <tr>
                    <td className="sticky left-0 z-10 bg-card border border-border px-2.5 py-1 text-muted text-[0.7rem]">Prom. diario (transcurrido)</td>
                    {calMonths.map((mk) => (
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
            <CardDescription>% sobre {descartadosTotal} leads descartados (histórico)</CardDescription>
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
    </main>
  )
}
