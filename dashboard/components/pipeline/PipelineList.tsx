'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lead } from '@/lib/supabase'
import { PipelineCard } from './PipelineCard'
import { CalificarButtons } from '@/components/LeadActions'
import { Badge } from '@/components/ui/badge'
import { FiTrendingUp, FiExternalLink, FiMapPin, FiRefreshCw } from 'react-icons/fi'

export interface SegEstado {
  estado: 'hecho' | 'pendiente' | 'vencido'
  dias: number
}

export interface PipelineItem {
  lead: Lead
  ownerNumero?: string | null
  ownerCount?: number
  followupCount?: number
  faseUsados?: number
  seg?: SegEstado
}

interface Props {
  /** 'triage' = filas de Sin calificar; 'card' = PipelineCard del resto de etapas. */
  variant: 'triage' | 'card'
  /** Leads frescos del server (se re-consultan en cada revalidación). */
  items: PipelineItem[]
  /** Cantidad exacta de la etapa en la DB (para detectar leads nuevos). */
  liveTotal: number
  mostrarEtapa: boolean
  mostrarVisto: boolean
  volverA: string
  tab: string
  tabLabel: string
}

/**
 * Lista con orden congelado. Calificar o mover un lead re-consulta el server
 * (para mantener los contadores de arriba), pero la lista visible NO se reordena:
 * el orden se siembra una vez y solo cambia al pulsar "Actualizar". El lead sobre
 * el que actuás desaparece en su lugar (deja de estar entre los ids vivos) y el
 * resto no se mueve. Los leads nuevos que aparezcan en la DB no se cuelan solos:
 * se ofrecen con un botón abajo. Así no se pierde de vista el lead que estabas
 * trabajando al abrir su link.
 */
export function PipelineList({
  variant,
  items,
  liveTotal,
  mostrarEtapa,
  mostrarVisto,
  volverA,
  tab,
  tabLabel,
}: Props) {
  // Orden congelado + total al momento de la última sincronización. Persisten a
  // través de las revalidaciones del server porque el componente mantiene su
  // estado (mismo `key`); solo se re-siembran al cambiar de pestaña/filtro.
  const [frozen, setFrozen] = useState(items)
  const [frozenTotal, setFrozenTotal] = useState(liveTotal)
  const [, startRefresh] = useTransition()
  const router = useRouter()
  // "Actualizar" pide datos frescos al server; los adoptamos cuando llegan.
  const adoptOnNext = useRef(false)

  useEffect(() => {
    if (!adoptOnNext.current) return
    adoptOnNext.current = false
    setFrozen(items)
    setFrozenTotal(liveTotal)
  }, [items, liveTotal])

  const liveById = new Map(items.map((i) => [i.lead.id, i]))

  // Orden estable con datos frescos: recorremos el orden congelado pero mostramos
  // la versión viva de cada lead; los que ya no están (calificados/movidos) se caen.
  const displayed = frozen
    .map((f) => liveById.get(f.lead.id))
    .filter((i): i is PipelineItem => !!i)

  // Los que saqué yo desde el baseline vs. lo que dice la DB: el resto son nuevos.
  const gone = frozen.length - displayed.length
  const nuevos = liveTotal - (frozenTotal - gone)

  const actualizar = () => {
    setFrozen(items)
    setFrozenTotal(liveTotal)
    adoptOnNext.current = true
    startRefresh(() => router.refresh())
  }

  if (displayed.length === 0 && nuevos <= 0) {
    return (
      <div className="text-center py-24 text-muted">
        <FiTrendingUp size={36} className="mx-auto mb-4 opacity-30" />
        <p className="text-base font-semibold text-navy dark:text-cream/70">
          {tab === 'sin_calificar' ? 'No hay leads sin calificar' : `Sin leads en «${tabLabel}»`}
        </p>
        {tab === 'lead' && <p className="text-sm mt-1">Calificá leads para que entren al pipeline</p>}
        {tab === 'sin_calificar' && (
          <p className="text-sm mt-1">Corré el scraper para traer nuevos perfiles</p>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2.5">
      {displayed.map((item) =>
        variant === 'triage' ? (
          <TriageRow key={item.lead.id} lead={item.lead} />
        ) : (
          <PipelineCard
            key={item.lead.id}
            lead={item.lead}
            ownerNumero={item.ownerNumero ?? null}
            ownerCount={item.ownerCount ?? 0}
            mostrarEtapa={mostrarEtapa}
            visto={!!item.lead.visto_at}
            mostrarVisto={mostrarVisto}
            volverA={volverA}
            followupCount={item.followupCount ?? 0}
            faseUsados={item.faseUsados ?? 0}
            seg={item.seg}
          />
        )
      )}

      {nuevos !== 0 && (
        <button
          onClick={actualizar}
          className="mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl text-sm font-semibold border border-border bg-card/60 backdrop-blur-sm text-foreground hover:bg-foreground/5 active:scale-[0.99] transition-colors"
        >
          <FiRefreshCw size={14} />
          {nuevos > 0 ? `Cargar ${nuevos} nuevo${nuevos === 1 ? '' : 's'}` : 'Actualizar lista'}
        </button>
      )}
    </div>
  )
}

/** Fila de la cola "Sin calificar": link al perfil + botones de calificación. */
function TriageRow({ lead }: { lead: Lead }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card/60 backdrop-blur-sm">
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
  )
}
