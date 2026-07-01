'use client'

import Link from 'next/link'
import { useTransition } from 'react'
import { Lead } from '@/lib/supabase'
import { cambiarEtapa } from '@/lib/pipeline'
import { ETAPAS, ETAPA_LABEL, SIGUIENTE, type Etapa } from '@/lib/pipeline-stages'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FiMoreVertical, FiMapPin, FiPhone, FiGlobe, FiMessageCircle, FiChevronRight } from 'react-icons/fi'

interface Props {
  lead: Lead
  ownerNumero: string | null
  ownerCount: number
  followupCount: number
}

export function PipelineCard({ lead, ownerNumero, ownerCount, followupCount }: Props) {
  const [isPending, startTransition] = useTransition()
  const next = SIGUIENTE[lead.etapa as Etapa]

  return (
    <div className="relative flex items-center gap-2 p-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm hover:bg-foreground/[0.03] transition-colors">
      {/* Click en el resto de la card → detalle */}
      <Link href={`/pipeline/${lead.id}`} aria-label={`Abrir ${lead.username}`} className="absolute inset-0 rounded-2xl" />

      {/* Info (los clics pasan al overlay, salvo el nombre) */}
      <div className="relative flex-1 min-w-0 pointer-events-none">
        <div className="flex items-center gap-2">
          <a
            href={lead.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="pointer-events-auto font-semibold text-foreground truncate hover:underline underline-offset-2 decoration-foreground/40"
          >
            {lead.nombre_empresa || `@${lead.username}`}
          </a>
          {lead.nombre_empresa && <span className="text-xs text-muted truncate">@{lead.username}</span>}
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
      </div>

      {/* Acciones */}
      <div className="relative pointer-events-auto shrink-0 flex items-center gap-1.5">
        {next && (
          <button
            onClick={() => startTransition(() => cambiarEtapa(lead.id, next.etapa))}
            disabled={isPending}
            title={`Pasar a ${ETAPA_LABEL[next.etapa]}`}
            className="inline-flex items-center gap-0.5 pl-2.5 pr-1.5 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-[0.97] transition disabled:opacity-50"
          >
            {next.label} <FiChevronRight size={13} />
          </button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isPending}
            title="Mover a etapa"
            className="grid place-items-center h-8 w-8 rounded-xl text-muted hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
          >
            <FiMoreVertical size={16} />
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
    </div>
  )
}
