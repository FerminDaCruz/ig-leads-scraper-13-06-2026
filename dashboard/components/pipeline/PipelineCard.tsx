'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Lead } from '@/lib/supabase'
import { cambiarEtapa } from '@/lib/pipeline'
import { ETAPAS, ETAPA_LABEL, type Etapa } from '@/lib/pipeline-stages'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FiChevronDown, FiMapPin, FiPhone, FiGlobe, FiMessageCircle } from 'react-icons/fi'

interface Props {
  lead: Lead
  ownerNumero: string | null
  ownerCount: number
  followupCount: number
}

export function PipelineCard({ lead, ownerNumero, ownerCount, followupCount }: Props) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center gap-2 p-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm hover:bg-foreground/[0.03] transition-colors">
      <Link href={`/pipeline/${lead.id}`} className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-foreground truncate">
            {lead.nombre_empresa || `@${lead.username}`}
          </span>
          {lead.nombre_empresa && (
            <span className="text-xs text-muted truncate">@{lead.username}</span>
          )}
        </div>
        <div className="flex items-center gap-x-3 gap-y-0.5 mt-1 text-xs text-muted flex-wrap">
          {lead.ubicaciones && (
            <span className="inline-flex items-center gap-1 truncate max-w-[140px]">
              <FiMapPin size={11} /> {lead.ubicaciones}
            </span>
          )}
          {ownerNumero && (
            <span className="inline-flex items-center gap-1">
              <FiPhone size={11} /> {ownerNumero}{ownerCount > 1 ? ` +${ownerCount - 1}` : ''}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <FiGlobe size={11} /> web: {lead.tiene_web === true ? 'sí' : lead.tiene_web === false ? 'no' : '—'}
          </span>
          {followupCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <FiMessageCircle size={11} /> {followupCount}
            </span>
          )}
        </div>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={isPending}
          className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-foreground/[0.06] text-foreground hover:bg-foreground/10 transition-colors disabled:opacity-50"
        >
          {ETAPA_LABEL[lead.etapa as Etapa] ?? lead.etapa}
          <FiChevronDown size={13} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Mover a etapa</DropdownMenuLabel>
          {ETAPAS.map((e) => (
            <DropdownMenuItem
              key={e}
              onClick={() => startTransition(() => cambiarEtapa(lead.id, e))}
              className={e === lead.etapa ? 'font-semibold text-foreground' : ''}
            >
              {ETAPA_LABEL[e]}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
