export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { ETAPAS, DEFAULT_KPIS, KPI_ETAPAS, kpiEsNumero } from '@/lib/pipeline-stages'
import { CopyReport } from '@/components/CopyReport'
import { KpiConfig } from '@/components/metricas/KpiConfig'
import { PeriodoPicker, type Semana } from '@/components/metricas/PeriodoPicker'
import { FilterLink, PendingDim } from '@/components/NavPending'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

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
const pad = (n: number) => String(n).padStart(2, '0')
const diaLabelFmt = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })
function diaLabel(mk: string, day: number) { const [y, m] = mk.split('-').map(Number); return diaLabelFmt.format(new Date(Date.UTC(y, m - 1, day))) }
const dmFmt = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' })
function fmtDM(dateStr: string) { const [y, m, d] = dateStr.split('-').map(Number); return dmFmt.format(new Date(Date.UTC(y, m - 1, d))) }
// Aritmética de fechas calendario (YYYY-MM-DD, sin huso).
function mondayOf(dateStr: string) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7))
  return dt.toISOString().slice(0, 10)
}
function addDaysISO(dateStr: string, n: number) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d))
  dt.setUTCDate(dt.getUTCDate() + n)
  return dt.toISOString().slice(0, 10)
}
// Rangos de consulta en ISO (UTC), tomando medianoche ART.
function dayRangeISO(mk: string, day: number) {
  const startMs = new Date(`${mk}-${pad(day)}T00:00:00-03:00`).getTime()
  return { start: new Date(startMs).toISOString(), end: new Date(startMs + 86400000).toISOString() }
}
function weekRangeFromMonday(monday: string) {
  const startMs = new Date(`${monday}T00:00:00-03:00`).getTime()
  return { start: new Date(startMs).toISOString(), end: new Date(startMs + 7 * 86400000).toISOString() }
}

// Etapas >= la dada (para contar "alcanzó esta etapa" por etapa actual)
const reachedFrom = (etapa: string) => ETAPAS.slice((ETAPAS as readonly string[]).indexOf(etapa))

// Embudo con los nombres de cada métrica (A es la base = iniciados).
const FUNNEL = [
  { code: 'A', label: 'Iniciados', sub: 'Mensajes enviados (base)', etapa: 'iniciado', dateCol: 'contacted_at' },
  { code: 'OP', label: 'Tasa de apertura de mensajes', sub: '% de AV sobre A', etapa: 'visto', dateCol: 'visto_at' },
  { code: 'PRR', label: 'Tasa de respuesta positiva', sub: '% de B sobre A', etapa: 'interesado', dateCol: 'interesado_at' },
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
  searchParams: Promise<{ mes?: string; vista?: string; dia?: string; sem?: string }>
}) {
  const { mes: mesParam, vista: vistaParam, dia: diaParam, sem: semParam } = await searchParams
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

  // ── Selección de día / semana ────────────────────────────────────────────────
  const dim = mes ? daysInMonth(mes) : 30
  const esMesActual = mes === currentMonthKey
  const maxDay = mes ? (esMesActual ? curD : dim) : 0 // último día disponible (no futuro)
  const todayDay = esMesActual ? curD : null

  // Día seleccionado (por defecto: hoy si es el mes en curso, si no el último del mes).
  let selDay = maxDay
  if (vista === 'dia' && diaParam && /^\d{4}-\d{2}-\d{2}$/.test(diaParam) && diaParam.slice(0, 7) === mes) {
    const d = Number(diaParam.slice(8, 10))
    if (d >= 1 && d <= maxDay) selDay = d
  }

  // Semanas lunes–domingo que tocan el mes (las que cruzan dos meses aparecen
  // en ambos). Cada semana se identifica por su lunes (YYYY-MM-DD).
  const weeks: Semana[] = []
  if (mes) {
    const lastDay = `${mes}-${pad(dim)}`
    let mon = mondayOf(`${mes}-01`)
    while (mon <= lastDay) {
      const sun = addDaysISO(mon, 6)
      weeks.push({ key: mon, label: `${fmtDM(mon)} – ${fmtDM(sun)}`, started: mon <= todayISO })
      mon = addDaysISO(mon, 7)
    }
  }
  const thisWeekKey = mondayOf(todayISO)
  const disponibles = weeks.filter((w) => w.started)
  let selWeekKey = disponibles.length ? disponibles[disponibles.length - 1].key : weeks[0]?.key || ''
  if (vista === 'semana' && semParam && weeks.some((w) => w.key === semParam && w.started)) selWeekKey = semParam
  const selWeek = weeks.find((w) => w.key === selWeekKey)

  // Rango de consulta según la vista (día / semana / mes; null = histórico).
  let range: { start: string; end: string } | null = null
  if (esMes && mes) {
    if (vista === 'dia') range = dayRangeISO(mes, selDay)
    else if (vista === 'semana' && selWeek) range = weekRangeFromMonday(selWeek.key)
    else range = monthRange(mes)
  }

  // Etiquetas del período.
  const isToday = esMesActual && selDay === curD
  const isThisWeek = selWeekKey === thisWeekKey
  const diaTexto = mes ? diaLabel(mes, selDay) : ''
  const semanaTexto = selWeek ? selWeek.label : ''
  const periodoCorto = vista === 'dia' ? (isToday ? 'hoy' : diaTexto) : vista === 'semana' ? (isThisWeek ? 'esta semana' : `sem. ${semanaTexto}`) : ''

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
      // 'visto' ya no es etapa: la apertura (OP) se cuenta por visto_at.
      else if (s.code === 'OP') q = q.not('visto_at', 'is', null)
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
  // Tasa de calificación: solo sobre los ya revisados (calificados + descartados),
  // no sobre los que todavía esperan calificación.
  const revisados = calificados + descartados
  const tasaCalif = revisados > 0 ? (calificados / revisados) * 100 : 0

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

  // Metas del número de iniciados (A). En vista mes hay una sola (mensual).
  // En día/semana hay dos:
  //  · fija     = meta mensual ÷ días (o semanas) del mes. Estática.
  //  · ajustada = lo que falta de la meta ÷ los días (o semanas) que quedan del mes.
  //    Dinámica: si no prospecto, sube; si me adelanto, baja. Solo para el mes en curso.
  const goalA = kpiMap['iniciado']
  const iniciadosMes = mes ? monthTotals.get(mes) || 0 : 0
  const remainingDays = Math.max(dim - curD, 1) // días que quedan (hoy ya cuenta como usado)
  const remainingGoal = Math.max(goalA - iniciadosMes, 0)
  const metaFijaA = vista === 'semana' ? goalA / (dim / 7) : goalA / dim
  const metaAjustA = !esMesActual ? null : vista === 'semana' ? remainingGoal / (remainingDays / 7) : remainingGoal / remainingDays

  // Opciones del filtro de mes
  const monthOptions = Array.from(new Set([...monthsPresent, currentMonthKey])).sort().reverse()

  const iniciadosBase = funnelCounts[0]
  const vistaLabel = esTodos
    ? 'histórico completo'
    : vista === 'dia'
    ? `${diaTexto}${isToday ? ' (hoy)' : ''}`
    : vista === 'semana'
    ? `Semana ${semanaTexto}${isThisWeek ? ' (esta semana)' : ''}`
    : monthLabel(mes!)

  // ── Texto del reporte (Copiar) — totales del período ──
  const reporteTexto = `=== MÉTRICAS — IG LEADS ===
Vista: ${vistaLabel}

ACTIVIDAD (${esTodos ? 'histórico' : 'del mes'})
- Encontrados: ${encontrados}  |  Calificados: ${calificados}  |  Descartados: ${descartados}
- Tasa de calificación: ${fmtPct(tasaCalif)} (calificados / ${revisados} revisados)

EMBUDO DE ETAPAS (${esMes ? 'entraron en el mes' : 'alcanzaron la etapa'})
${FUNNEL.map((s, i) => {
  const n = funnelCounts[i]
  const p = iniciadosBase > 0 ? (n / iniciadosBase) * 100 : 0
  const kpi = kpiMap[s.etapa]
  const esNum = kpiEsNumero(s.etapa)
  const vistaPeriodo = esMes && (vista === 'dia' || vista === 'semana')
  const targetA = vistaPeriodo ? metaAjustA ?? metaFijaA : kpi
  const meets = esNum ? n >= targetA : p >= kpi
  const meta = esNum
    ? vistaPeriodo
      ? `fija ≥${fmtNum(metaFijaA)}${metaAjustA != null ? ` · ajustada ≥${fmtNum(metaAjustA)}` : ''}`
      : `meta ≥${kpi}`
    : `meta ≥${kpi}%`
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
            <FilterLink
              key={o.key}
              href={`/metricas?mes=${o.key}`}
              className={`shrink-0 px-3.5 py-1.5 rounded-xl text-sm font-medium capitalize transition-colors ${
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {o.label}
            </FilterLink>
          )
        })}
      </div>

      {/* Sub-vista día / semana (solo con un mes seleccionado) */}
      {esMes && mes && (
        <div className="flex items-center gap-2 mb-6 flex-wrap">
          {VISTAS.map((v) => {
            const active = vista === v.key
            return (
              <FilterLink
                key={v.key}
                href={`/metricas?mes=${mes}&vista=${v.key}`}
                className={`px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                {v.label}
              </FilterLink>
            )
          })}
          {(vista === 'dia' || vista === 'semana') && (
            <PeriodoPicker
              mes={mes}
              vista={vista}
              maxDay={maxDay}
              daysInMonth={dim}
              selectedDay={selDay}
              todayDay={todayDay}
              selectedWeekKey={selWeekKey}
              weeks={weeks}
              diaTexto={diaTexto}
              semanaTexto={semanaTexto}
            />
          )}
        </div>
      )}

      <PendingDim>
      {/* Actividad del período (Scraper → yo) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Encontrados', display: encontrados.toLocaleString('es-AR'), hint: 'perfiles del scraper', color: 'text-brand' },
          { label: 'Calificados', display: calificados.toLocaleString('es-AR'), hint: 'los pasé a lead', color: 'text-green-600 dark:text-green-400' },
          { label: 'Descartados', display: descartados.toLocaleString('es-AR'), hint: 'los descarté', color: 'text-red-500 dark:text-red-400' },
          { label: 'Tasa de calificación', display: fmtPct(tasaCalif), hint: `calificados / ${revisados.toLocaleString('es-AR')} revisados`, color: 'text-navy dark:text-cream' },
        ].map((c) => (
          <Card key={c.label}>
            <CardContent className="p-4">
              <p className="text-xs text-muted mb-1.5">{c.label}{periodoCorto && <span className="text-foreground/80 font-medium"> {periodoCorto}</span>}</p>
              <p className={`text-3xl font-bold ${c.color}`}>{c.display}</p>
              <p className="text-xs text-muted mt-1.5">{c.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Embudo de etapas — cuadro con KPIs */}
      <Card className="mb-4 overflow-x-auto">
        <CardHeader className="pb-2">
          <CardTitle>Embudo de etapas {periodoCorto && <span className="font-normal text-muted">· {periodoCorto}</span>}</CardTitle>
          <CardDescription>
            Total real del período · % s/ A (Iniciados). Las tasas (%) no cambian por día/semana.
            {esMes && (vista === 'dia' || vista === 'semana')
              ? ` A muestra dos metas: fija (meta ÷ ${vista === 'dia' ? 'días' : 'semanas'} del mes) y ritmo (lo que falta ÷ lo que queda del mes).`
              : ' La meta de A es el número mensual.'}
          </CardDescription>
        </CardHeader>
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead>Métrica</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">% s/ A</TableHead>
              <TableHead className="text-center">Meta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {FUNNEL.map((s, i) => {
              const n = funnelCounts[i]
              const p = iniciadosBase > 0 ? (n / iniciadosBase) * 100 : 0
              const esNum = kpiEsNumero(s.etapa)
              const kpi = kpiMap[s.etapa]
              const vistaPeriodo = esMes && (vista === 'dia' || vista === 'semana')
              const green = 'text-green-600 dark:text-green-400'
              const red = 'text-red-500 dark:text-red-400'
              const meetsPct = !esNum && p >= kpi
              return (
                <TableRow key={s.code}>
                  <TableCell>
                    <div className="flex items-baseline gap-1.5">
                      <span className="font-bold text-navy dark:text-cream">{s.code}</span>
                      <span className="text-sm text-navy dark:text-cream/80">{s.label}</span>
                    </div>
                    <span className="text-xs text-muted">{s.sub}</span>
                  </TableCell>
                  <TableCell className="text-center font-bold text-navy dark:text-cream tnum">{n.toLocaleString('es-AR')}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold tnum ${esNum ? 'text-foreground' : meetsPct ? green : red}`}>
                      {i === 0 ? '100%' : fmtPct(p)}
                    </span>
                  </TableCell>
                  {!esNum ? (
                    <TableCell className={`text-center font-semibold tnum ${p >= kpi ? green : red}`}>≥{kpi}%</TableCell>
                  ) : !vistaPeriodo ? (
                    <TableCell className={`text-center font-semibold tnum ${n >= goalA ? green : red}`}>≥{fmtNum(goalA)}</TableCell>
                  ) : (
                    <TableCell className="text-center">
                      <div className="flex flex-col gap-0.5 items-center text-xs tnum leading-tight">
                        <span className="text-muted">fija <b className={n >= metaFijaA ? green : red}>≥{fmtNum(metaFijaA)}</b></span>
                        {metaAjustA != null && (
                          <span className="text-muted">ritmo <b className={n >= metaAjustA ? green : red}>≥{fmtNum(metaAjustA)}</b></span>
                        )}
                      </div>
                    </TableCell>
                  )}
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
      </PendingDim>
    </main>
  )
}
