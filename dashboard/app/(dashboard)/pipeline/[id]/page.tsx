export const dynamic = 'force-dynamic'

import { getSupabase, Lead, Owner, Followup } from '@/lib/supabase'
import { EtapaControl, LeadFieldsEditor, OwnersEditor, FollowupsEditor } from '@/components/pipeline/editors'
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

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
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
      <Link href="/pipeline" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors w-fit">
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

      <Section title="Datos">
        <LeadFieldsEditor lead={lead} />
      </Section>

      <Section title="Dueños">
        <OwnersEditor leadId={lead.id} owners={owners} />
      </Section>

      <Section title="Seguimientos">
        <FollowupsEditor leadId={lead.id} followups={followups} />
      </Section>
    </main>
  )
}
