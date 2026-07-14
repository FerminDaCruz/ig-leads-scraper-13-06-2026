export const dynamic = 'force-dynamic'

import { getSupabase, Lead, Owner, Followup } from '@/lib/supabase'
import { EtapaControl, CanalControl, LeadFieldsEditor, OwnersEditor, FollowupsEditor } from '@/components/pipeline/editors'
import type { Canal } from '@/lib/pipeline-stages'
import { Card } from '@/components/ui/card'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { FiArrowLeft, FiExternalLink, FiMapPin } from 'react-icons/fi'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <h2 className="font-semibold text-navy dark:text-cream mb-4">{title}</h2>
      {children}
    </Card>
  )
}

// De dónde vino el usuario (?from=etapa%3Diniciado%26seg%3Dsin). Viene de la URL,
// así que se reconstruye clave por clave en vez de pegarlo tal cual.
const FROM_KEYS = ['etapa', 'q', 'web', 'seg', 'res'] as const
function volverHref(from?: string) {
  if (!from) return '/pipeline'
  const src = new URLSearchParams(from)
  const out = new URLSearchParams()
  for (const k of FROM_KEYS) {
    const v = src.get(k)
    if (v) out.set(k, v)
  }
  const qs = out.toString()
  return qs ? `/pipeline?${qs}` : '/pipeline'
}

export default async function LeadDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ from?: string }>
}) {
  const { id } = await params
  const { from } = await searchParams
  const leadId = Number(id)
  if (!Number.isFinite(leadId)) notFound()

  const supabase = getSupabase()
  const [{ data: leadData }, { data: ownersData }, { data: fupsData }] = await Promise.all([
    supabase.from('leads').select('*').eq('id', leadId).single(),
    supabase.from('lead_owners').select('*').eq('lead_id', leadId).order('id'),
    supabase.from('lead_followups').select('*').eq('lead_id', leadId).order('indice'),
  ])
  if (!leadData) notFound()
  const lead = leadData as Lead
  const owners = (ownersData || []) as Owner[]
  const followups = (fupsData || []) as Followup[]

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <Link href={volverHref(from)} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors w-fit">
        <FiArrowLeft size={15} /> Volver al pipeline
      </Link>

      {/* Cabecera */}
      <div>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="text-2xl font-bold text-navy dark:text-cream">
            {lead.nombre_empresa || `@${lead.username}`}
          </h1>
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground transition-colors"
          >
            @{lead.username} <FiExternalLink size={13} />
          </a>
        </div>
        <div className="flex items-center gap-3 mt-1 text-sm text-muted flex-wrap">
          {lead.ubicaciones && (
            <span className="inline-flex items-center gap-1"><FiMapPin size={13} /> {lead.ubicaciones}</span>
          )}
          {lead.nichos && <span className="truncate">{lead.nichos}</span>}
        </div>
      </div>

      <Section title="Etapa y fechas">
        <EtapaControl lead={lead} />
      </Section>

      <Section title="Canal de contacto">
        <CanalControl lead={lead} />
      </Section>

      <Section title="Datos">
        <LeadFieldsEditor lead={lead} />
      </Section>

      <Section title="Dueños">
        <OwnersEditor leadId={lead.id} owners={owners} />
      </Section>

      <Section title="Seguimientos">
        <FollowupsEditor leadId={lead.id} canal={lead.canal as Canal} followups={followups} />
      </Section>
    </main>
  )
}
