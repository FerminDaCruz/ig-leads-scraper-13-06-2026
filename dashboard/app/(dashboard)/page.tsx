export const dynamic = 'force-dynamic'

import { getSupabase } from '@/lib/supabase'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'
import {
  FiColumns, FiTrendingUp, FiSliders, FiClock,
  FiUserCheck, FiSend, FiAlertTriangle, FiArrowRight, FiSearch, FiCheckCircle,
} from 'react-icons/fi'

const AR_TZ = 'America/Argentina/Buenos_Aires'
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: AR_TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
const fechaLargaFmt = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: AR_TZ })
const horaAR = () => Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: AR_TZ }).format(new Date()))

function saludo() {
  const h = horaAR()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buen día'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

async function count(q: PromiseLike<{ count: number | null }>) {
  const { count } = await q
  return count || 0
}

export default async function Home() {
  const supabase = getSupabase()

  const todayISO = dayFmt.format(new Date())
  const startToday = `${todayISO}T00:00:00-03:00`
  const endToday = new Date(new Date(startToday).getTime() + 86400000).toISOString()
  const sevenAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const sel = () => supabase.from('leads').select('id', { count: 'exact', head: true })

  const [
    encontradosHoy, calificadosHoy, iniciadosHoy,
    sinCalificar, leadsParaContactar, cerrados,
    fupRes, vencidosCandRes,
  ] = await Promise.all([
    count(sel().gte('first_seen_at', startToday).lt('first_seen_at', endToday)),
    count(sel().eq('calificado', true).gte('qualified_at', startToday).lt('qualified_at', endToday)),
    count(sel().gte('contacted_at', startToday).lt('contacted_at', endToday)),
    count(sel().is('calificado', null)),
    count(sel().eq('etapa', 'lead').eq('calificado', true)),
    count(sel().eq('etapa', 'cerrado')),
    supabase.from('lead_followups').select('lead_id').eq('fase', 'iniciado'),
    supabase.from('leads').select('id').in('etapa', ['iniciado', 'visto']).lte('contacted_at', sevenAgo),
  ])

  // Seguimientos vencidos: en iniciado/visto, contactados hace ≥1 semana y sin seguimiento.
  const segSet = new Set((fupRes.data || []).map((r) => (r as { lead_id: number }).lead_id))
  const seguimientosVencidos = (vencidosCandRes.data || []).filter((l) => !segSet.has((l as { id: number }).id)).length

  const hoy = [
    { label: 'Encontrados', value: encontradosHoy, icon: FiSearch, color: 'text-brand' },
    { label: 'Calificados', value: calificadosHoy, icon: FiCheckCircle, color: 'text-green-600 dark:text-green-400' },
    { label: 'Iniciados', value: iniciadosHoy, icon: FiSend, color: 'text-navy dark:text-cream' },
  ]

  const pendientes = [
    {
      label: 'Sin calificar', value: sinCalificar, href: '/pipeline',
      icon: FiUserCheck, hint: 'perfiles esperando revisión',
      urgente: sinCalificar > 0, tono: 'default' as const,
    },
    {
      label: 'Leads para contactar', value: leadsParaContactar, href: '/pipeline?etapa=lead',
      icon: FiSend, hint: 'calificados sin iniciar',
      urgente: false, tono: 'default' as const,
    },
    {
      label: 'Seguimientos vencidos', value: seguimientosVencidos, href: '/pipeline?etapa=iniciado&seg=sin',
      icon: FiAlertTriangle, hint: 'pasó ≥1 semana sin seguimiento',
      urgente: seguimientosVencidos > 0, tono: 'warn' as const,
    },
  ]

  const secciones = [
    { href: '/pipeline', label: 'Pipeline', desc: 'Calificá y movés leads por etapa', icon: FiColumns },
    { href: '/metricas', label: 'Métricas', desc: 'Embudo, KPIs y actividad', icon: FiTrendingUp },
    { href: '/scraper', label: 'Scraper', desc: 'Nichos, ubicaciones y rendimiento', icon: FiSliders },
    { href: '/historial', label: 'Historial', desc: 'Todos los leads y su estado', icon: FiClock },
  ]

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy dark:text-cream">{saludo()} 👋</h1>
        <p className="text-muted text-sm mt-1 capitalize">{fechaLargaFmt.format(new Date())}</p>
      </div>

      {/* Actividad de hoy */}
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Hoy</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {hoy.map((c) => {
          const Icon = c.icon
          return (
            <Card key={c.label}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted mb-1.5">
                  <Icon size={14} />
                  <span className="text-xs">{c.label}</span>
                </div>
                <p className={`text-3xl font-bold ${c.color}`}>{c.value.toLocaleString('es-AR')}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Pendientes accionables */}
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Pendientes</h2>
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {pendientes.map((p) => {
          const Icon = p.icon
          const warn = p.tono === 'warn' && p.value > 0
          return (
            <Link key={p.label} href={p.href} className="group">
              <Card className={`transition-colors ${warn ? 'border-amber-400/60 bg-amber-50/60 dark:bg-amber-500/[0.06] hover:bg-amber-50 dark:hover:bg-amber-500/10' : 'hover:bg-foreground/[0.03]'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className={`flex items-center gap-2 ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted'}`}>
                      <Icon size={14} />
                      <span className="text-xs">{p.label}</span>
                    </div>
                    <FiArrowRight size={14} className="text-muted opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                  </div>
                  <p className={`text-3xl font-bold ${warn ? 'text-amber-600 dark:text-amber-400' : 'text-navy dark:text-cream'}`}>
                    {p.value.toLocaleString('es-AR')}
                  </p>
                  <p className="text-xs text-muted mt-1.5">{p.hint}</p>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* Resumen / cierres */}
      <div className="mb-8">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <span className="grid place-items-center h-10 w-10 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 shrink-0">
              <FiCheckCircle size={20} />
            </span>
            <div>
              <p className="text-sm text-muted">Cerrados en total</p>
              <p className="text-xl font-bold text-navy dark:text-cream">{cerrados.toLocaleString('es-AR')}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accesos a secciones */}
      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Secciones</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {secciones.map((s) => {
          const Icon = s.icon
          return (
            <Link key={s.href} href={s.href} className="group">
              <Card className="h-full transition-colors hover:bg-foreground/[0.03]">
                <CardContent className="p-4 flex flex-col gap-2">
                  <span className="grid place-items-center h-10 w-10 rounded-xl bg-foreground/[0.06] text-foreground">
                    <Icon size={19} />
                  </span>
                  <div>
                    <p className="font-semibold text-navy dark:text-cream flex items-center gap-1">
                      {s.label}
                      <FiArrowRight size={14} className="text-muted opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0 transition-all" />
                    </p>
                    <p className="text-xs text-muted mt-0.5">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>
    </main>
  )
}
