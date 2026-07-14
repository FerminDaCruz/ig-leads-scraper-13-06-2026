'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Lead } from '@/lib/supabase'
import { cambiarEtapa, marcarResultado, registrarSeguimiento } from '@/lib/pipeline'
import {
  ETAPAS, ETAPA_LABEL, RESULTADOS, RESULTADO_LABEL, SIGUIENTE,
  FASE_DE_ETAPA, FASE_MAX, type Etapa,
} from '@/lib/pipeline-stages'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FiMoreVertical, FiMapPin, FiPhone, FiGlobe, FiMessageCircle, FiChevronRight, FiClock, FiCheckCircle, FiAlertTriangle, FiSlash, FiXOctagon, FiThumbsDown, FiRotateCcw, FiEdit3, FiX } from 'react-icons/fi'
import type { Resultado } from '@/lib/pipeline-stages'

// yyyy-mm-dd en horario de Argentina (para <input type="date">).
const hoyInput = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())
const fromDateInput = (d: string) => (d ? `${d}T12:00:00-03:00` : null)

const RES_ICON: Record<Resultado, typeof FiSlash> = {
  no_interesado: FiThumbsDown,
  bloqueado: FiXOctagon,
  no_recibe_mensajes: FiSlash,
}
const RES_BADGE: Record<Resultado, string> = {
  no_interesado: 'bg-muted/15 text-muted',
  bloqueado: 'bg-red-500/12 text-red-600 dark:text-red-400',
  no_recibe_mensajes: 'bg-amber-500/12 text-amber-600 dark:text-amber-400',
}

interface SegEstado {
  estado: 'hecho' | 'pendiente' | 'vencido'
  dias: number
}

interface Props {
  lead: Lead
  ownerNumero: string | null
  ownerCount: number
  followupCount: number
  /** Seguimientos ya anotados en la fase que le toca a la etapa actual del lead. */
  faseUsados: number
  /** En la pestaña Todos se mezclan etapas: la tarjeta necesita decir en cuál está. */
  mostrarEtapa?: boolean
  /** Query de la vista actual del pipeline: el detalle la usa para volver acá. */
  volverA?: string
  seg?: SegEstado
}

export function PipelineCard({ lead, ownerNumero, ownerCount, followupCount, faseUsados, mostrarEtapa, volverA, seg }: Props) {
  const [isPending, startTransition] = useTransition()
  const [anotando, setAnotando] = useState(false)
  const [fecha, setFecha] = useState(hoyInput)
  const [mensaje, setMensaje] = useState('')
  const next = SIGUIENTE[lead.etapa as Etapa]
  const flagged = lead.resultado === 'no_interesado' || lead.resultado === 'bloqueado'
  // Un lead con resultado no arrastra la alerta de seguimiento (contacto cerrado).
  const vencido = seg?.estado === 'vencido' && !flagged

  // Fase de seguimiento de la etapa actual; null si la etapa no admite (lead / agendado / cerrado).
  const fase = FASE_DE_ETAPA[lead.etapa as Etapa]
  const puedeAnotar = !!fase && faseUsados < FASE_MAX[fase]

  const cerrarAnotacion = () => {
    setAnotando(false)
    setFecha(hoyInput())
    setMensaje('')
  }

  const confirmarAnotacion = () => {
    if (!fase) return
    startTransition(async () => {
      await registrarSeguimiento(lead.id, fase, mensaje, fromDateInput(fecha))
      cerrarAnotacion()
    })
  }

  return (
    <div
      className={`p-3 rounded-2xl border backdrop-blur-sm transition-colors ${
        vencido
          ? 'border-amber-400/70 bg-amber-50/70 dark:bg-amber-500/[0.07] hover:bg-amber-50 dark:hover:bg-amber-500/10'
          : flagged
          ? 'border-border bg-card/40 hover:bg-foreground/[0.03] opacity-70 hover:opacity-100'
          : 'border-border bg-card/60 hover:bg-foreground/[0.03]'
      }`}
    >
      {/* En mobile la info va arriba y las acciones abajo; en desktop, en una línea. */}
      <div className="relative flex flex-col gap-2.5 sm:flex-row sm:items-center sm:gap-2">
      {/* Click en el resto de la card → detalle */}
      <Link
        href={`/pipeline/${lead.id}${volverA ? `?from=${encodeURIComponent(volverA)}` : ''}`}
        aria-label={`Abrir ${lead.username}`}
        className="absolute -inset-3 rounded-2xl"
      />

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
          {mostrarEtapa && (
            <span className="shrink-0 px-1.5 py-0.5 rounded-md text-[0.65rem] font-semibold bg-foreground/[0.07] text-muted">
              {lead.calificado === null ? 'Sin calificar' : ETAPA_LABEL[lead.etapa as Etapa] ?? lead.etapa}
            </span>
          )}
          {flagged && (() => {
            const RIcon = RES_ICON[lead.resultado!]
            return (
              <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[0.65rem] font-semibold ${RES_BADGE[lead.resultado!]}`}>
                <RIcon size={10} />
                {RESULTADO_LABEL[lead.resultado!]}
              </span>
            )
          })()}
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
          {seg?.estado === 'vencido' && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <FiAlertTriangle size={11} /> Seguimiento vencido · hace {seg.dias} d
            </span>
          )}
          {seg?.estado === 'pendiente' && (
            <span className="inline-flex items-center gap-1">
              <FiClock size={11} /> Seguimiento en {seg.dias} d
            </span>
          )}
          {seg?.estado === 'hecho' && (
            <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
              <FiCheckCircle size={11} /> Seguimiento hecho
            </span>
          )}
        </div>
      </div>

      {/* Acciones */}
      <div className="relative pointer-events-auto shrink-0 flex items-center justify-end gap-1.5">
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
        {puedeAnotar && (
          <button
            onClick={() => (anotando ? cerrarAnotacion() : setAnotando(true))}
            disabled={isPending}
            title="Anotar seguimiento"
            aria-expanded={anotando}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-[0.97] disabled:opacity-50 ${
              anotando
                ? 'border-foreground/30 bg-foreground/10 text-foreground'
                : 'border-border text-muted hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            <FiEdit3 size={13} /> Anotar
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
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Resultado del contacto</DropdownMenuLabel>
            {RESULTADOS.map((r) => {
              const RIcon = RES_ICON[r]
              return (
                <DropdownMenuItem
                  key={r}
                  onClick={() => startTransition(() => marcarResultado(lead.id, r))}
                  className={lead.resultado === r ? 'font-semibold text-foreground' : ''}
                >
                  <RIcon size={14} className="mr-2" />
                  {RESULTADO_LABEL[r]}
                </DropdownMenuItem>
              )
            })}
            {flagged && (
              <DropdownMenuItem onClick={() => startTransition(() => marcarResultado(lead.id, null))}>
                <FiRotateCcw size={14} className="mr-2" /> Reactivar
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>

      {/* Anotar seguimiento: registra lo que ya se mandó, no lo envía. */}
      {anotando && puedeAnotar && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2.5">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-muted" htmlFor={`seg-fecha-${lead.id}`}>
              Fecha
            </label>
            <input
              id={`seg-fecha-${lead.id}`}
              type="date"
              value={fecha}
              max={hoyInput()}
              onChange={(e) => setFecha(e.target.value)}
              disabled={isPending}
              className="px-2 py-1 text-xs rounded-lg border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
            />
          </div>
          <textarea
            autoFocus
            value={mensaje}
            onChange={(e) => setMensaje(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') cerrarAnotacion()
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirmarAnotacion()
            }}
            rows={3}
            disabled={isPending}
            placeholder="Mensaje del seguimiento que mandaste..."
            className="w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted resize-y disabled:opacity-50"
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={cerrarAnotacion}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              <FiX size={13} /> Cancelar
            </button>
            <button
              onClick={confirmarAnotacion}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-[0.97] transition disabled:opacity-50"
            >
              <FiCheckCircle size={13} /> Confirmar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
