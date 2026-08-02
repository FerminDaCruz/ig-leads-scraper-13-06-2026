export const dynamic = 'force-dynamic'

import { getSupabase, Lead, Owner } from '@/lib/supabase'
import { getHiddenLocations } from '@/lib/hidden'
import { ETAPAS, ETAPA_LABEL, ETAPA_FECHA, FASE_DE_ETAPA, RESULTADOS, RESULTADO_LABEL, type Etapa, type Resultado } from '@/lib/pipeline-stages'
import { PipelineList, type PipelineItem } from '@/components/pipeline/PipelineList'
import { PipelineSearch } from '@/components/pipeline/PipelineSearch'
import { FilterLink, PendingDim } from '@/components/NavPending'
import { FiGlobe, FiSlash, FiClock, FiCheckCircle, FiXOctagon, FiThumbsDown, FiUserCheck, FiAlertCircle, FiSend, FiPhoneCall, FiUsers, FiEye, FiEyeOff } from 'react-icons/fi'

const RES_ICON: Record<Resultado, typeof FiSlash> = {
  no_interesado: FiThumbsDown,
  bloqueado: FiXOctagon,
  no_recibe_mensajes: FiSlash,
}

// El seguimiento se hace 1 semana después del contacto si no hubo respuesta.
const SEG_DIAS = 7
function segEstado(contactedAt: string | null, hecho: boolean): { estado: 'hecho' | 'pendiente' | 'vencido'; dias: number } {
  if (hecho) return { estado: 'hecho', dias: 0 }
  if (!contactedAt) return { estado: 'pendiente', dias: SEG_DIAS }
  const transcurridos = Math.floor((Date.now() - new Date(contactedAt).getTime()) / 86400000)
  if (transcurridos >= SEG_DIAS) return { estado: 'vencido', dias: transcurridos } // días desde el contacto
  return { estado: 'pendiente', dias: SEG_DIAS - transcurridos } // días para el seguimiento
}

// 'todos' = sin filtro de etapa; sirve para buscar cualquier lead con la lupa.
// 'otro_canal' = los que salieron de Instagram (WhatsApp / llamada).
type TabKey = 'sin_calificar' | 'todos' | 'otro_canal' | Etapa
const TABS: { key: TabKey; label: string }[] = [
  { key: 'sin_calificar', label: 'Sin calificar' },
  ...ETAPAS.map((e) => ({ key: e as TabKey, label: ETAPA_LABEL[e] })),
  { key: 'otro_canal', label: 'Otro canal' },
  { key: 'todos', label: 'Todos' },
]
const isTab = (v: string): v is TabKey => TABS.some((t) => t.key === v)

// Sub-colas de "Otro canal": buscar el número es una tarea distinta de escribir.
type Sub = 'sin_numero' | 'whatsapp' | 'llamada'
const isSub = (v: string): v is Sub => v === 'sin_numero' || v === 'whatsapp' || v === 'llamada'

async function contar(supabase: ReturnType<typeof getSupabase>, key: TabKey) {
  let q = supabase.from('leads').select('*', { count: 'exact', head: true })
  if (key === 'sin_calificar') q = q.is('calificado', null)
  else if (key === 'otro_canal') q = q.neq('canal', 'instagram')
  else if (key !== 'todos') {
    q = q.eq('etapa', key)
    if (key === 'lead') q = q.eq('calificado', true)
    // Iniciado muestra los activos de Instagram por defecto (vistos y no vistos
    // juntos: es la cola de seguimiento). Los mudados a WhatsApp/llamada van a "Otro canal".
    if (key === 'iniciado') q = q.is('resultado', null).eq('canal', 'instagram')
  }
  const { count } = await q
  return count || 0
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; q?: string; web?: string; seg?: string; res?: string; sub?: string; vis?: string }>
}) {
  const params = await searchParams
  const tab: TabKey = params.etapa && isTab(params.etapa) ? params.etapa : 'sin_calificar'
  const q = (params.q || '').trim()
  // Sub-cola dentro de "Otro canal" (por defecto: todos los mudados).
  const sub: Sub | null = params.sub && isSub(params.sub) ? params.sub : null
  // Filtro con/sin web en la etapa Lead (por defecto: sin web).
  const web: 'con' | 'sin' = params.web === 'con' ? 'con' : 'sin'
  // Filtro por resultado del contacto en Iniciado (por defecto: activos).
  const segTabs = tab === 'iniciado'
  const res: 'activos' | Resultado =
    params.res === 'no_interesado' || params.res === 'bloqueado' ? params.res : 'activos'
  const verActivos = res === 'activos'
  // Filtro con/sin seguimiento (solo aplica a los activos).
  const seg: 'con' | 'sin' = params.seg === 'con' ? 'con' : 'sin'
  // Filtro por apertura (visto / no visto). 'todos' = ambos (por defecto).
  const vis: 'todos' | 'si' | 'no' = params.vis === 'si' || params.vis === 'no' ? params.vis : 'todos'
  const supabase = getSupabase()

  const counts = await Promise.all(TABS.map((t) => contar(supabase, t.key)))
  const countByTab = Object.fromEntries(TABS.map((t, i) => [t.key, counts[i]])) as Record<TabKey, number>

  // Leads que ya tienen seguimiento de la fase 'iniciado' (compartida por Iniciado/Visto)
  // POR INSTAGRAM: un DM viejo no cuenta como seguimiento hecho por WhatsApp.
  let segIds: number[] = []
  if (segTabs && verActivos) {
    const { data } = await supabase
      .from('lead_followups')
      .select('lead_id')
      .eq('fase', 'iniciado')
      .eq('canal', 'instagram')
    segIds = Array.from(new Set((data || []).map((r) => (r as { lead_id: number }).lead_id)))
  }
  const segSet = new Set(segIds)

  // Cuántos activos de esta etapa tienen y no tienen seguimiento (para los chips).
  // countByTab[tab] ya son los activos de Instagram de la etapa: el resto es resta.
  let segCount = { sin: 0, con: 0 }
  if (segTabs && verActivos) {
    const { count } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('etapa', tab)
      .is('resultado', null)
      .eq('canal', 'instagram')
      .in('id', segIds.length ? segIds : [-1])
    const con = count || 0
    segCount = { con, sin: Math.max(countByTab[tab] - con, 0) }
  }

  // Vistos / no vistos DENTRO de la selección de seguimiento actual: si estás en
  // "sin seguimiento", las chips cuentan solo entre los sin seguimiento (y viceversa).
  let vistoCount = { si: 0, no: 0 }
  if (segTabs && verActivos) {
    let vq = supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .eq('etapa', tab)
      .is('resultado', null)
      .eq('canal', 'instagram')
      .not('visto_at', 'is', null)
    if (seg === 'con') vq = vq.in('id', segIds.length ? segIds : [-1])
    else if (segIds.length) vq = vq.not('id', 'in', `(${segIds.join(',')})`)
    const { count } = await vq
    const si = count || 0
    // El total de la selección actual es segCount[seg]: el resto no vio el mensaje.
    vistoCount = { si, no: Math.max(segCount[seg] - si, 0) }
  }

  // Triage (sin calificar / lead) respeta las ubicaciones ocultas por defecto.
  const triage = tab === 'sin_calificar' || tab === 'lead'
  const hidden = triage ? await getHiddenLocations() : []

  let query = supabase.from('leads').select('*')
  if (tab === 'sin_calificar') query = query.is('calificado', null)
  else if (tab === 'todos') {
    // Sin filtro: la lista completa, para buscar sin depender de la etapa.
  } else if (tab === 'otro_canal') {
    query = query.neq('canal', 'instagram')
    if (sub === 'whatsapp' || sub === 'llamada') query = query.eq('canal', sub)
  } else if (tab === 'lead') {
    query = query.eq('etapa', 'lead').eq('calificado', true)
    if (web === 'con') query = query.eq('tiene_web', true)
    else query = query.or('tiene_web.eq.false,tiene_web.is.null')
  } else query = query.eq('etapa', tab)
  for (const loc of hidden) query = query.not('ubicaciones', 'ilike', `%${loc}%`)

  // Resultado del contacto (Iniciado/Visto): activos vs. no interesado / bloqueado.
  // Los activos son los de Instagram: los mudados tienen su propia pestaña.
  if (segTabs) {
    if (verActivos) query = query.is('resultado', null).eq('canal', 'instagram')
    else query = query.eq('resultado', res)
  }

  // Filtro por seguimiento (solo entre los activos).
  if (segTabs && verActivos) {
    if (seg === 'con') query = query.in('id', segIds.length ? segIds : [-1])
    else if (segIds.length) query = query.not('id', 'in', `(${segIds.join(',')})`)
  }

  // Filtro por apertura (visto / no visto). 'todos' no filtra.
  if (segTabs && verActivos) {
    if (vis === 'si') query = query.not('visto_at', 'is', null)
    else if (vis === 'no') query = query.is('visto_at', null)
  }

  // Búsqueda por nombre de empresa o @usuario.
  if (q) {
    const safe = q.replace(/[%,()]/g, ' ').trim()
    // En @usuario no hay espacios: se escriben como . o _ (o nada). Tratamos cada
    // espacio como comodín para que "cabaña ejemplo" matchee "cabaña_ejemplo".
    const userPat = safe.replace(/\s+/g, '%')
    query = query.or(`username.ilike.%${userPat}%,nombre_empresa.ilike.%${safe}%`)
  }

  const dateCol =
    tab !== 'sin_calificar' && tab !== 'todos' && tab !== 'otro_canal' ? ETAPA_FECHA[tab] : null
  if (tab === 'todos') {
    // Los más nuevos primero (la búsqueda manda; el orden es solo el de reposo).
    query = query.order('first_seen_at', { ascending: false, nullsFirst: false })
  } else if (tab === 'otro_canal') {
    // El que hace más tiempo espera en el canal nuevo, primero.
    query = query.order('canal_at', { ascending: true, nullsFirst: false })
  } else if (segTabs && !verActivos) {
    // No interesados / bloqueados: los más recientes primero.
    query = query.order('resultado_at', { ascending: false, nullsFirst: false })
  } else if (segTabs && seg === 'sin') {
    // Sin seguimiento: el contacto más viejo primero (seguimiento más urgente).
    query = query.order('contacted_at', { ascending: true, nullsFirst: false })
  } else if (dateCol) {
    query = query.order(dateCol, { ascending: false, nullsFirst: false })
  } else {
    query = query.order('veces_encontrado', { ascending: false })
  }

  const { data: leadsData } = await query.limit(tab === 'sin_calificar' ? 100 : 300)
  const traidos = (leadsData || []) as Lead[]

  // Dueños + cantidad de seguimientos (solo para las etapas del pipeline).
  const ownersByLead = new Map<number, Owner[]>()
  const fupByLead = new Map<number, number>()
  // Seguimientos por lead, fase y CANAL: el cupo de una fase se cuenta por canal,
  // así el DM viejo no te consume el primer mensaje de WhatsApp.
  const fupByLeadFase = new Map<string, number>()
  const ids = traidos.map((l) => l.id)
  if (tab !== 'sin_calificar' && ids.length) {
    const [{ data: owners }, { data: fups }] = await Promise.all([
      supabase.from('lead_owners').select('*').in('lead_id', ids),
      supabase.from('lead_followups').select('lead_id, fase, canal').in('lead_id', ids),
    ])
    for (const o of (owners || []) as Owner[]) {
      const arr = ownersByLead.get(o.lead_id) || []
      arr.push(o)
      ownersByLead.set(o.lead_id, arr)
    }
    for (const f of (fups || []) as { lead_id: number; fase: string; canal: string }[]) {
      fupByLead.set(f.lead_id, (fupByLead.get(f.lead_id) || 0) + 1)
      const k = `${f.lead_id}:${f.fase}:${f.canal}`
      fupByLeadFase.set(k, (fupByLeadFase.get(k) || 0) + 1)
    }
  }

  // "Sin número" cruza los dos canales, así que se filtra acá (ya tenemos los dueños).
  const tieneNumero = (l: Lead) => (ownersByLead.get(l.id) || []).some((o) => o.numero)
  const leads =
    tab === 'otro_canal' && sub === 'sin_numero' ? traidos.filter((l) => !tieneNumero(l)) : traidos

  const tabLabel = TABS.find((t) => t.key === tab)!.label

  // Vista actual, para que el detalle del lead sepa a dónde volver.
  const volverA = (() => {
    const p = new URLSearchParams({ etapa: tab })
    if (q) p.set('q', q)
    if (tab === 'otro_canal' && sub) p.set('sub', sub)
    if (tab === 'lead') p.set('web', web)
    if (segTabs) {
      p.set('res', res)
      if (verActivos) {
        p.set('seg', seg)
        if (vis !== 'todos') p.set('vis', vis)
      }
    }
    return p.toString()
  })()

  // View-models para la lista: el orden y los datos se calculan acá (server) y la
  // lista cliente los congela para no reordenarse al calificar/mover un lead.
  const variant = tab === 'sin_calificar' ? 'triage' : 'card'
  const mostrarEtapa = tab === 'todos' || tab === 'otro_canal'
  const mostrarVisto = segTabs && verActivos
  const items: PipelineItem[] = leads.map((lead) => {
    if (tab === 'sin_calificar') return { lead }
    const owners = ownersByLead.get(lead.id) || []
    const f = FASE_DE_ETAPA[lead.etapa as Etapa]
    return {
      lead,
      ownerNumero: owners.find((o) => o.numero)?.numero || null,
      ownerCount: owners.length,
      followupCount: fupByLead.get(lead.id) || 0,
      faseUsados: f ? fupByLeadFase.get(`${lead.id}:${f}:${lead.canal}`) || 0 : 0,
      seg: mostrarVisto ? segEstado(lead.contacted_at, segSet.has(lead.id)) : undefined,
    }
  })

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Pipeline</h1>
        <p className="text-muted text-sm mt-1">Calificá y gestioná tus leads por etapa</p>
      </div>

      {/* Buscador */}
      <div className="mb-4">
        <PipelineSearch />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
        {TABS.map((t) => {
          const active = t.key === tab
          const qs = new URLSearchParams({ etapa: t.key })
          if (q) qs.set('q', q)
          return (
            <FilterLink
              key={t.key}
              href={`/pipeline?${qs.toString()}`}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {t.label}
              <span className={`text-xs tnum font-semibold ${active ? 'text-background/70' : 'text-muted'}`}>
                {countByTab[t.key]}
              </span>
            </FilterLink>
          )
        })}
      </div>

      {/* Filtro con/sin web (solo etapa Lead) */}
      {tab === 'lead' && (
        <div className="flex gap-2 mb-4">
          {(['sin', 'con'] as const).map((w) => {
            const active = web === w
            const qs = new URLSearchParams({ etapa: 'lead', web: w })
            if (q) qs.set('q', q)
            return (
              <FilterLink
                key={w}
                href={`/pipeline?${qs.toString()}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                {w === 'sin' ? <FiSlash size={13} /> : <FiGlobe size={13} />}
                {w === 'sin' ? 'Sin web' : 'Con web'}
              </FilterLink>
            )
          })}
        </div>
      )}

      {/* Sub-colas de Otro canal: conseguir el número es una tarea distinta de escribir */}
      {tab === 'otro_canal' && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {([null, 'sin_numero', 'whatsapp', 'llamada'] as const).map((s) => {
            const active = sub === s
            const qs = new URLSearchParams({ etapa: 'otro_canal' })
            if (s) qs.set('sub', s)
            if (q) qs.set('q', q)
            const Icon = s === 'sin_numero' ? FiAlertCircle : s === 'whatsapp' ? FiSend : s === 'llamada' ? FiPhoneCall : FiUsers
            const label = s === 'sin_numero' ? 'Sin número' : s === 'whatsapp' ? 'WhatsApp' : s === 'llamada' ? 'Llamar' : 'Todos'
            return (
              <FilterLink
                key={s ?? 'todos'}
                href={`/pipeline?${qs.toString()}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                {label}
              </FilterLink>
            )
          })}
        </div>
      )}

      {/* Filtro por resultado del contacto (etapas Iniciado y Visto) */}
      {segTabs && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {(['activos', ...RESULTADOS] as const).map((r) => {
            const active = res === r
            const qs = new URLSearchParams({ etapa: tab, res: r })
            if (q) qs.set('q', q)
            const Icon = r === 'activos' ? FiUserCheck : RES_ICON[r]
            return (
              <FilterLink
                key={r}
                href={`/pipeline?${qs.toString()}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                {r === 'activos' ? 'Activos' : RESULTADO_LABEL[r]}
              </FilterLink>
            )
          })}
        </div>
      )}

      {/* Filtro con/sin seguimiento (solo entre los activos) */}
      {segTabs && verActivos && (
        <div className="flex gap-2 mb-4">
          {(['sin', 'con'] as const).map((s) => {
            const active = seg === s
            // Preserva el filtro de apertura al cambiar de seguimiento.
            const qs = new URLSearchParams({ etapa: tab, seg: s, vis })
            if (q) qs.set('q', q)
            return (
              <FilterLink
                key={s}
                href={`/pipeline?${qs.toString()}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                {s === 'sin' ? <FiClock size={13} /> : <FiCheckCircle size={13} />}
                {s === 'sin' ? 'Sin seguimiento' : 'Con seguimiento'}
                <span className={`text-xs tnum font-semibold ${active ? 'text-background/70' : 'text-muted'}`}>
                  {segCount[s]}
                </span>
              </FilterLink>
            )
          })}
        </div>
      )}

      {/* Filtro por apertura: visto es una característica, no una etapa. Por defecto
          se ven todos juntos (la cola de seguimiento no se parte). */}
      {segTabs && verActivos && (
        <div className="flex gap-2 mb-4">
          {(['todos', 'si', 'no'] as const).map((v) => {
            const active = vis === v
            const qs = new URLSearchParams({ etapa: tab, res, seg, vis: v })
            if (q) qs.set('q', q)
            const Icon = v === 'si' ? FiEye : v === 'no' ? FiEyeOff : FiUsers
            const label = v === 'si' ? 'Visto' : v === 'no' ? 'No visto' : 'Todos'
            return (
              <FilterLink
                key={v}
                href={`/pipeline?${qs.toString()}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                  active
                    ? 'bg-foreground text-background shadow-sm'
                    : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
                }`}
              >
                <Icon size={13} />
                {label}
                {v !== 'todos' && (
                  <span className={`text-xs tnum font-semibold ${active ? 'text-background/70' : 'text-muted'}`}>
                    {v === 'si' ? vistoCount.si : vistoCount.no}
                  </span>
                )}
              </FilterLink>
            )
          })}
        </div>
      )}

      <PendingDim>
      {q && (
        <p className="text-xs text-muted mb-3 -mt-2">
          {leads.length} resultado{leads.length === 1 ? '' : 's'} para «{q}» en {tabLabel}
        </p>
      )}

      {/* Lista (orden congelado: no se reordena al calificar/mover un lead) */}
      <PipelineList
        key={volverA}
        variant={variant}
        items={items}
        liveTotal={countByTab[tab]}
        mostrarEtapa={mostrarEtapa}
        mostrarVisto={mostrarVisto}
        volverA={volverA}
        tab={tab}
        tabLabel={tabLabel}
      />
      </PendingDim>
    </main>
  )
}
