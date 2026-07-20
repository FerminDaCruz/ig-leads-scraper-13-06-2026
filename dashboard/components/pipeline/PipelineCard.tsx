'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Lead } from '@/lib/supabase'
import { cambiarEtapa, marcarResultado, registrarSeguimiento, cambiarCanal, marcarVisto } from '@/lib/pipeline'
import {
  ETAPAS, ETAPA_LABEL, RESULTADOS, RESULTADO_LABEL, SIGUIENTE,
  FASE_DE_ETAPA, FASE_MAX, CANAL_LABEL, MOTIVOS_CANAL, MOTIVO_CANAL_LABEL,
  type Etapa, type Canal, type MotivoCanal,
} from '@/lib/pipeline-stages'
import { waLink, telLink } from '@/lib/phone'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FiMoreVertical, FiMapPin, FiPhone, FiGlobe, FiMessageCircle, FiChevronRight, FiClock, FiCheckCircle, FiAlertTriangle, FiSlash, FiXOctagon, FiThumbsDown, FiRotateCcw, FiEdit3, FiX, FiSend, FiPhoneCall, FiInstagram, FiCheck, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi'
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

const CANAL_ICON: Record<Canal, typeof FiSlash> = {
  instagram: FiInstagram,
  whatsapp: FiSend,
  llamada: FiPhoneCall,
}
const CANAL_BADGE: Record<Canal, string> = {
  instagram: 'bg-foreground/[0.07] text-muted',
  whatsapp: 'bg-green-500/12 text-green-700 dark:text-green-400',
  llamada: 'bg-blue-500/12 text-blue-700 dark:text-blue-400',
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
  /** Si el mensaje fue visto (apertura). Es una característica, no una etapa. */
  visto?: boolean
  /** Muestra el toggle de "Visto" en las acciones (tab Iniciado). */
  mostrarVisto?: boolean
  /** Query de la vista actual del pipeline: el detalle la usa para volver acá. */
  volverA?: string
  seg?: SegEstado
}

export function PipelineCard({ lead, ownerNumero, ownerCount, followupCount, faseUsados, mostrarEtapa, visto, mostrarVisto, volverA, seg }: Props) {
  const [isPending, startTransition] = useTransition()
  const [anotando, setAnotando] = useState(false)
  const [fecha, setFecha] = useState(hoyInput)
  const [mensaje, setMensaje] = useState('')
  // Mudanza de canal: se elige el canal desde el menú y el motivo acá.
  const [mudando, setMudando] = useState<Canal | null>(null)
  const next = SIGUIENTE[lead.etapa as Etapa]
  const flagged = lead.resultado === 'no_interesado' || lead.resultado === 'bloqueado'
  // Un lead con resultado no arrastra la alerta de seguimiento (contacto cerrado).
  const vencido = seg?.estado === 'vencido' && !flagged

  // Fase de seguimiento de la etapa actual; null si la etapa no admite (lead / agendado / cerrado).
  const fase = FASE_DE_ETAPA[lead.etapa as Etapa]
  const puedeAnotar = !!fase && faseUsados < FASE_MAX[fase]

  const canal = lead.canal as Canal
  const CanalIcon = CANAL_ICON[canal]
  const wa = canal === 'whatsapp' ? waLink(ownerNumero) : null
  const tel = canal === 'llamada' ? telLink(ownerNumero) : null
  // Sin número no hay a quién escribir: la tarea pasa a ser conseguirlo.
  const sinNumero = canal !== 'instagram' && !ownerNumero

  const cerrarAnotacion = () => {
    setAnotando(false)
    setFecha(hoyInput())
    setMensaje('')
  }

  const confirmarAnotacion = () => {
    if (!fase) return
    startTransition(async () => {
      await registrarSeguimiento(lead.id, fase, canal, mensaje, fromDateInput(fecha))
      cerrarAnotacion()
    })
  }

  const confirmarMudanza = (motivo: MotivoCanal) => {
    if (!mudando) return
    startTransition(async () => {
      await cambiarCanal(lead.id, mudando, motivo)
      setMudando(null)
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
          {canal !== 'instagram' && (
            <span className={`shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[0.65rem] font-semibold ${CANAL_BADGE[canal]}`}>
              <CanalIcon size={10} />
              {CANAL_LABEL[canal]}
            </span>
          )}
          {visto && (
            <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[0.65rem] font-semibold bg-sky-500/12 text-sky-700 dark:text-sky-400">
              <FiEye size={10} /> Visto
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
          {sinNumero && (
            <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
              <FiAlertCircle size={11} /> Falta el número
            </span>
          )}
          {canal !== 'instagram' && lead.canal_motivo && (
            <span className="inline-flex items-center gap-1">
              {MOTIVO_CANAL_LABEL[lead.canal_motivo as MotivoCanal]}
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
        {/* Abre WhatsApp / el teléfono. Contactar es afuera; anotarlo, acá. */}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            title={`Escribir a ${ownerNumero} por WhatsApp`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-green-600/40 text-green-700 dark:text-green-400 hover:bg-green-500/10 active:scale-[0.97] transition"
          >
            <FiSend size={13} /> WhatsApp
          </a>
        )}
        {tel && (
          <a
            href={tel}
            title={`Llamar a ${ownerNumero}`}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border border-blue-600/40 text-blue-700 dark:text-blue-400 hover:bg-blue-500/10 active:scale-[0.97] transition"
          >
            <FiPhoneCall size={13} /> Llamar
          </a>
        )}
        {mostrarVisto && (
          <button
            onClick={() => startTransition(() => marcarVisto(lead.id, !visto))}
            disabled={isPending}
            title={visto ? 'Quitar visto (no vio el mensaje)' : 'Marcar visto (abrió el mensaje)'}
            aria-pressed={visto}
            className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition active:scale-[0.97] disabled:opacity-50 ${
              visto
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-400'
                : 'border-border text-muted hover:text-foreground hover:bg-foreground/5'
            }`}
          >
            {visto ? <FiEye size={13} /> : <FiEyeOff size={13} />} Visto
          </button>
        )}
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
            <DropdownMenuLabel>Apertura</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => startTransition(() => marcarVisto(lead.id, !visto))}
              className={visto ? 'font-semibold text-foreground' : ''}
            >
              {visto ? <FiEyeOff size={14} className="mr-2" /> : <FiEye size={14} className="mr-2" />}
              {visto ? 'Quitar visto' : 'Marcar visto'}
            </DropdownMenuItem>
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
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Canal de contacto</DropdownMenuLabel>
            {(['whatsapp', 'llamada'] as const).map((c) => {
              const CIcon = CANAL_ICON[c]
              return (
                <DropdownMenuItem
                  key={c}
                  onClick={() => setMudando(c)}
                  className={canal === c ? 'font-semibold text-foreground' : ''}
                >
                  <CIcon size={14} className="mr-2" />
                  Pasar a {CANAL_LABEL[c]}
                </DropdownMenuItem>
              )
            })}
            {canal !== 'instagram' && (
              <DropdownMenuItem onClick={() => startTransition(() => cambiarCanal(lead.id, 'instagram', null))}>
                <FiInstagram size={14} className="mr-2" /> Volver a Instagram
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      </div>

      {/* Mudanza de canal: falta el motivo, que es lo que después querés medir. */}
      {mudando && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-2.5">
          <p className="text-xs text-muted">
            Pasar a <span className="font-semibold text-foreground">{CANAL_LABEL[mudando]}</span> porque…
          </p>
          <div className="flex flex-wrap gap-1.5">
            {MOTIVOS_CANAL.map((m) => (
              <button
                key={m}
                onClick={() => confirmarMudanza(m)}
                disabled={isPending}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium border border-border text-muted hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
              >
                <FiCheck size={12} /> {MOTIVO_CANAL_LABEL[m]}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-end">
            <button
              onClick={() => setMudando(null)}
              disabled={isPending}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
            >
              <FiX size={13} /> Cancelar
            </button>
          </div>
        </div>
      )}

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
