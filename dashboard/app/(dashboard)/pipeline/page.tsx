export const dynamic = 'force-dynamic'

import { getSupabase, Lead, Owner } from '@/lib/supabase'
import { getHiddenLocations } from '@/lib/hidden'
import { ETAPAS, ETAPA_LABEL, ETAPA_FECHA, type Etapa } from '@/lib/pipeline-stages'
import { PipelineCard } from '@/components/pipeline/PipelineCard'
import { PipelineSearch } from '@/components/pipeline/PipelineSearch'
import { CalificarButtons } from '@/components/LeadActions'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { FiTrendingUp, FiExternalLink, FiMapPin, FiGlobe, FiSlash } from 'react-icons/fi'

type TabKey = 'sin_calificar' | Etapa
const TABS: { key: TabKey; label: string }[] = [
  { key: 'sin_calificar', label: 'Sin calificar' },
  ...ETAPAS.map((e) => ({ key: e as TabKey, label: ETAPA_LABEL[e] })),
]
const isTab = (v: string): v is TabKey => TABS.some((t) => t.key === v)

async function contar(supabase: ReturnType<typeof getSupabase>, key: TabKey) {
  let q = supabase.from('leads').select('*', { count: 'exact', head: true })
  if (key === 'sin_calificar') q = q.is('calificado', null)
  else {
    q = q.eq('etapa', key)
    if (key === 'lead') q = q.eq('calificado', true)
  }
  const { count } = await q
  return count || 0
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string; q?: string; web?: string }>
}) {
  const params = await searchParams
  const tab: TabKey = params.etapa && isTab(params.etapa) ? params.etapa : 'sin_calificar'
  const q = (params.q || '').trim()
  // Filtro con/sin web en la etapa Lead (por defecto: sin web).
  const web: 'con' | 'sin' = params.web === 'con' ? 'con' : 'sin'
  const supabase = getSupabase()

  const counts = await Promise.all(TABS.map((t) => contar(supabase, t.key)))
  const countByTab = Object.fromEntries(TABS.map((t, i) => [t.key, counts[i]])) as Record<TabKey, number>

  // Triage (sin calificar / lead) respeta las ubicaciones ocultas por defecto.
  const triage = tab === 'sin_calificar' || tab === 'lead'
  const hidden = triage ? await getHiddenLocations() : []

  let query = supabase.from('leads').select('*')
  if (tab === 'sin_calificar') query = query.is('calificado', null)
  else if (tab === 'lead') {
    query = query.eq('etapa', 'lead').eq('calificado', true)
    if (web === 'con') query = query.eq('tiene_web', true)
    else query = query.or('tiene_web.eq.false,tiene_web.is.null')
  } else query = query.eq('etapa', tab)
  for (const loc of hidden) query = query.not('ubicaciones', 'ilike', `%${loc}%`)

  // Búsqueda por nombre de empresa o @usuario.
  if (q) {
    const safe = q.replace(/[%,()]/g, ' ')
    query = query.or(`username.ilike.%${safe}%,nombre_empresa.ilike.%${safe}%`)
  }

  const dateCol = tab !== 'sin_calificar' ? ETAPA_FECHA[tab] : null
  query = dateCol
    ? query.order(dateCol, { ascending: false, nullsFirst: false })
    : query.order('veces_encontrado', { ascending: false })

  const { data: leadsData } = await query.limit(tab === 'sin_calificar' ? 100 : 300)
  const leads = (leadsData || []) as Lead[]

  // Dueños + cantidad de seguimientos (solo para las etapas del pipeline).
  const ownersByLead = new Map<number, Owner[]>()
  const fupByLead = new Map<number, number>()
  const ids = leads.map((l) => l.id)
  if (tab !== 'sin_calificar' && ids.length) {
    const [{ data: owners }, { data: fups }] = await Promise.all([
      supabase.from('lead_owners').select('*').in('lead_id', ids),
      supabase.from('lead_followups').select('lead_id').in('lead_id', ids),
    ])
    for (const o of (owners || []) as Owner[]) {
      const arr = ownersByLead.get(o.lead_id) || []
      arr.push(o)
      ownersByLead.set(o.lead_id, arr)
    }
    for (const f of (fups || []) as { lead_id: number }[]) {
      fupByLead.set(f.lead_id, (fupByLead.get(f.lead_id) || 0) + 1)
    }
  }

  const tabLabel = TABS.find((t) => t.key === tab)!.label

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
            <Link
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
            </Link>
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
              <Link
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
              </Link>
            )
          })}
        </div>
      )}

      {q && (
        <p className="text-xs text-muted mb-3 -mt-2">
          {leads.length} resultado{leads.length === 1 ? '' : 's'} para «{q}» en {tabLabel}
        </p>
      )}

      {/* Lista */}
      {leads.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <FiTrendingUp size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold text-navy dark:text-cream/70">
            {tab === 'sin_calificar' ? 'No hay leads sin calificar' : `Sin leads en «${tabLabel}»`}
          </p>
          {tab === 'lead' && (
            <p className="text-sm mt-1">Calificá leads para que entren al pipeline</p>
          )}
          {tab === 'sin_calificar' && (
            <p className="text-sm mt-1">Corré el scraper para traer nuevos perfiles</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {leads.map((lead) =>
            tab === 'sin_calificar' ? (
              <div
                key={lead.id}
                className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm"
              >
                <div className="flex-1 min-w-0">
                  <a
                    href={lead.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-foreground hover:underline underline-offset-2 decoration-foreground/40"
                  >
                    @{lead.username} <FiExternalLink size={12} className="text-muted" />
                  </a>
                  <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted flex-wrap">
                    {lead.ubicaciones && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[160px]">
                        <FiMapPin size={11} /> {lead.ubicaciones}
                      </span>
                    )}
                    {lead.nichos && <span className="truncate max-w-[180px]">{lead.nichos}</span>}
                    <span className="inline-flex items-center gap-1">
                      <Badge variant="count">{lead.veces_encontrado}</Badge>
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <CalificarButtons leadId={lead.id} username={lead.username} />
                </div>
              </div>
            ) : (
              (() => {
                const owners = ownersByLead.get(lead.id) || []
                const numero = owners.find((o) => o.numero)?.numero || null
                return (
                  <PipelineCard
                    key={lead.id}
                    lead={lead}
                    ownerNumero={numero}
                    ownerCount={owners.length}
                    followupCount={fupByLead.get(lead.id) || 0}
                  />
                )
              })()
            )
          )}
        </div>
      )}
    </main>
  )
}
