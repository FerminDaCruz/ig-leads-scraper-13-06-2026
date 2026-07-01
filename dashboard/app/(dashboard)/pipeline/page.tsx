export const dynamic = 'force-dynamic'

import { getSupabase, Lead, Owner } from '@/lib/supabase'
import { ETAPAS, ETAPA_LABEL, ETAPA_FECHA, isEtapa, type Etapa } from '@/lib/pipeline-stages'
import { PipelineCard } from '@/components/pipeline/PipelineCard'
import Link from 'next/link'
import { FiTrendingUp } from 'react-icons/fi'

// Una etapa pertenece al pipeline si: es 'lead' y está calificado, o ya avanzó.
function scopeQuery(supabase: ReturnType<typeof getSupabase>, etapa: Etapa) {
  let q = supabase.from('leads').select('*').eq('etapa', etapa)
  if (etapa === 'lead') q = q.eq('calificado', true)
  return q
}

async function contar(supabase: ReturnType<typeof getSupabase>, etapa: Etapa) {
  let q = supabase.from('leads').select('*', { count: 'exact', head: true }).eq('etapa', etapa)
  if (etapa === 'lead') q = q.eq('calificado', true)
  const { count } = await q
  return count || 0
}

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ etapa?: string }>
}) {
  const params = await searchParams
  const etapa: Etapa = params.etapa && isEtapa(params.etapa) ? params.etapa : 'lead'
  const supabase = getSupabase()

  // Conteos por etapa (en paralelo) para los tabs.
  const counts = await Promise.all(ETAPAS.map((e) => contar(supabase, e)))
  const countByEtapa = Object.fromEntries(ETAPAS.map((e, i) => [e, counts[i]])) as Record<Etapa, number>

  // Leads de la etapa seleccionada, ordenados por la fecha de esa etapa.
  const dateCol = ETAPA_FECHA[etapa]
  let q = scopeQuery(supabase, etapa)
  q = dateCol
    ? q.order(dateCol, { ascending: false, nullsFirst: false })
    : q.order('qualified_at', { ascending: false, nullsFirst: false })
  const { data: leadsData } = await q.limit(300)
  const leads = (leadsData || []) as Lead[]

  // Dueños y cantidad de seguimientos de esos leads (2 queries, sin N+1).
  const ids = leads.map((l) => l.id)
  const ownersByLead = new Map<number, Owner[]>()
  const fupByLead = new Map<number, number>()
  if (ids.length) {
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

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Pipeline</h1>
        <p className="text-muted text-sm mt-1">Gestioná tus leads por etapa</p>
      </div>

      {/* Tabs por etapa */}
      <div className="flex gap-2 mb-5 overflow-x-auto -mx-4 px-4 pb-1">
        {ETAPAS.map((e) => {
          const active = e === etapa
          return (
            <Link
              key={e}
              href={`/pipeline?etapa=${e}`}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                active
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {ETAPA_LABEL[e]}
              <span className={`text-xs tnum font-semibold ${active ? 'text-background/70' : 'text-muted'}`}>
                {countByEtapa[e]}
              </span>
            </Link>
          )
        })}
      </div>

      {/* Lista */}
      {leads.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <FiTrendingUp size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold text-navy dark:text-cream/70">
            Sin leads en «{ETAPA_LABEL[etapa]}»
          </p>
          {etapa === 'lead' && (
            <p className="text-sm mt-1">Marcá leads como «Calificado» para que entren al pipeline</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {leads.map((lead) => {
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
          })}
        </div>
      )}
    </main>
  )
}
