'use client'

import { useState, useTransition } from 'react'
import { Lead, Owner, Followup } from '@/lib/supabase'
import {
  ETAPAS, ETAPA_LABEL, ETAPA_FECHA, FASES, FASE_LABEL, FASE_MAX,
  RESULTADOS, RESULTADO_LABEL,
  type Etapa, type Fase, type Resultado,
} from '@/lib/pipeline-stages'
import {
  cambiarEtapa, actualizarFecha, actualizarCampos, marcarResultado,
  agregarOwner, actualizarOwner, eliminarOwner,
  registrarSeguimiento, actualizarFollowup, eliminarFollowup,
} from '@/lib/pipeline'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FiChevronDown, FiPlus, FiTrash2, FiSlash, FiXOctagon, FiThumbsDown, FiCheck, FiX } from 'react-icons/fi'

const RES_ICON: Record<Resultado, typeof FiSlash> = {
  no_interesado: FiThumbsDown,
  bloqueado: FiXOctagon,
  no_recibe_mensajes: FiSlash,
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted'

// yyyy-mm-dd en horario de Argentina (para <input type="date">)
const toDateInput = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(iso)) : ''
const fromDateInput = (d: string) => (d ? `${d}T12:00:00-03:00` : null)
const hoyInput = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())

// ── Tri-state Sí / No / — ────────────────────────────────────────────────────
function TriToggle({ value, onChange, disabled }: { value: boolean | null; onChange: (v: boolean | null) => void; disabled?: boolean }) {
  const opts: { v: boolean | null; l: string }[] = [
    { v: true, l: 'Sí' }, { v: false, l: 'No' }, { v: null, l: '—' },
  ]
  return (
    <div className={`inline-flex rounded-xl border border-border overflow-hidden transition-opacity ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}>
      {opts.map((o) => (
        <button
          key={o.l}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
            value === o.v ? 'bg-foreground text-background font-semibold' : 'text-muted enabled:hover:bg-foreground/5'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

// ── Etapa + fechas ───────────────────────────────────────────────────────────
export function EtapaControl({ lead }: { lead: Lead }) {
  const [isPending, startTransition] = useTransition()
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Etapa</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {ETAPA_LABEL[lead.etapa as Etapa] ?? lead.etapa}
            <FiChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
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

      {/* Resultado del contacto (ortogonal a la etapa) */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted">Resultado</span>
        <div className="inline-flex rounded-xl border border-border overflow-hidden">
          {RESULTADOS.map((r) => {
            const active = lead.resultado === r
            const Icon = RES_ICON[r]
            return (
              <button
                key={r}
                type="button"
                disabled={isPending}
                onClick={() => startTransition(() => marcarResultado(lead.id, r))}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                  active
                    ? r === 'bloqueado'
                      ? 'bg-red-500 text-white font-semibold'
                      : 'bg-foreground text-background font-semibold'
                    : 'text-muted enabled:hover:bg-foreground/5'
                }`}
              >
                <Icon size={13} /> {RESULTADO_LABEL[r]}
              </button>
            )
          })}
          <button
            type="button"
            disabled={isPending}
            onClick={() => startTransition(() => marcarResultado(lead.id, null))}
            className={`px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
              lead.resultado === null ? 'bg-foreground text-background font-semibold' : 'text-muted enabled:hover:bg-foreground/5'
            }`}
          >
            Activo
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        {(ETAPAS.filter((e) => ETAPA_FECHA[e]) as Etapa[]).map((e) => {
          const col = ETAPA_FECHA[e]!
          const val = (lead as unknown as Record<string, string | null>)[col]
          return (
            <label key={e} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted shrink-0">{ETAPA_LABEL[e]}</span>
              <input
                type="date"
                defaultValue={toDateInput(val)}
                disabled={isPending}
                onChange={(ev) => startTransition(() => actualizarFecha(lead.id, col, fromDateInput(ev.target.value)))}
                className="px-2.5 py-1.5 text-sm rounded-lg border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </label>
          )
        })}
      </div>
    </div>
  )
}

// ── Campos del lead ──────────────────────────────────────────────────────────
export function LeadFieldsEditor({ lead }: { lead: Lead }) {
  const [, startTransition] = useTransition()
  const [nombre, setNombre] = useState(lead.nombre_empresa || '')
  const [notas, setNotas] = useState(lead.notas || '')
  const save = (fields: Parameters<typeof actualizarCampos>[1]) => startTransition(() => actualizarCampos(lead.id, fields))

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Nombre de la empresa</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onBlur={() => nombre !== (lead.nombre_empresa || '') && save({ nombre_empresa: nombre.trim() || null })}
          className={inputCls}
          placeholder={`@${lead.username}`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">¿Tiene web?</span>
          <TriToggle value={lead.tiene_web} onChange={(v) => save({ tiene_web: v })} />
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${lead.tiene_web === true ? 'text-muted' : 'text-muted/50'}`}>¿Web mejorable?</span>
          <TriToggle
            value={lead.web_mejorable}
            onChange={(v) => save({ web_mejorable: v })}
            disabled={lead.tiene_web !== true}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">¿Activo en redes?</span>
          <TriToggle value={lead.activo_redes} onChange={(v) => save({ activo_redes: v })} />
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Notas</span>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          onBlur={() => notas !== (lead.notas || '') && save({ notas: notas.trim() || null })}
          rows={4}
          className={`${inputCls} resize-y`}
          placeholder="Notas del lead..."
        />
      </label>
    </div>
  )
}

// ── Dueños ───────────────────────────────────────────────────────────────────
export function OwnersEditor({ leadId, owners }: { leadId: number; owners: Owner[] }) {
  const [isPending, startTransition] = useTransition()
  const [nombre, setNombre] = useState('')
  const [numero, setNumero] = useState('')

  const add = () => {
    if (!nombre.trim() && !numero.trim()) return
    startTransition(() => agregarOwner(leadId, nombre, numero))
    setNombre(''); setNumero('')
  }

  return (
    <div className="flex flex-col gap-3">
      {owners.length === 0 && <p className="text-sm text-muted">Sin dueños cargados.</p>}
      {owners.map((o) => (
        <div key={o.id} className="flex flex-wrap items-center gap-2">
          <input
            defaultValue={o.nombre || ''}
            placeholder="Nombre"
            onBlur={(e) => startTransition(() => actualizarOwner(o.id, leadId, e.target.value, o.numero || ''))}
            className={`${inputCls} flex-1 min-w-[120px]`}
          />
          <input
            defaultValue={o.numero || ''}
            placeholder="Teléfono"
            onBlur={(e) => startTransition(() => actualizarOwner(o.id, leadId, o.nombre || '', e.target.value))}
            className={`${inputCls} flex-1 min-w-[120px]`}
          />
          <button
            onClick={() => startTransition(() => eliminarOwner(o.id, leadId))}
            disabled={isPending}
            title="Eliminar dueño"
            className="grid place-items-center h-9 w-9 rounded-xl text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <FiTrash2 size={15} />
          </button>
        </div>
      ))}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" className={`${inputCls} flex-1 min-w-[120px]`} />
        <input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Teléfono" className={`${inputCls} flex-1 min-w-[120px]`} />
        <button
          onClick={add}
          disabled={isPending || (!nombre.trim() && !numero.trim())}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-foreground text-background disabled:opacity-40 hover:opacity-90 active:scale-[0.97] transition shrink-0"
        >
          <FiPlus size={15} /> Dueño
        </button>
      </div>
    </div>
  )
}

// ── Seguimientos ─────────────────────────────────────────────────────────────
// Un seguimiento ya existente. Se edita en local y no toca la base hasta
// confirmar: un solo update con los tres campos en vez de uno por campo, y el
// usuario puede descartar (antes, hacer clic afuera ya guardaba).
function FollowupItem({ f, leadId }: { f: Followup; leadId: number }) {
  const [isPending, startTransition] = useTransition()
  const [guardado, setGuardado] = useState(false)
  const [mensaje, setMensaje] = useState(f.mensaje || '')
  const [fecha, setFecha] = useState(toDateInput(f.fecha))
  const [enviado, setEnviado] = useState(f.enviado)

  const sucio =
    mensaje.trim() !== (f.mensaje || '').trim() ||
    fecha !== toDateInput(f.fecha) ||
    enviado !== f.enviado

  const descartar = () => {
    setMensaje(f.mensaje || '')
    setFecha(toDateInput(f.fecha))
    setEnviado(f.enviado)
  }

  const confirmar = () =>
    startTransition(async () => {
      await actualizarFollowup(f.id, leadId, {
        mensaje: mensaje.trim() || null,
        fecha: fromDateInput(fecha),
        enviado,
      })
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    })

  return (
    <div className={`rounded-xl border bg-card/50 p-3 flex flex-col gap-2 transition-colors ${sucio ? 'border-foreground/30' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-muted">#{f.indice}</span>
          {guardado && !sucio && (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
              <FiCheck size={12} /> Guardado
            </span>
          )}
          {sucio && <span className="text-xs text-muted">Sin guardar</span>}
        </div>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={enviado}
              onChange={(e) => setEnviado(e.target.checked)}
              disabled={isPending}
              className="accent-foreground"
            />
            Enviado
          </label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            disabled={isPending}
            className="px-2 py-1 text-xs rounded-lg border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50"
          />
          <button
            onClick={() => startTransition(() => eliminarFollowup(f.id, leadId))}
            disabled={isPending}
            title="Eliminar seguimiento"
            className="grid place-items-center h-7 w-7 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors disabled:opacity-50"
          >
            <FiTrash2 size={13} />
          </button>
        </div>
      </div>
      <textarea
        value={mensaje}
        onChange={(e) => setMensaje(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') descartar()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && sucio) confirmar()
        }}
        rows={2}
        disabled={isPending}
        placeholder="Mensaje del seguimiento..."
        className={`${inputCls} resize-y text-sm disabled:opacity-50`}
      />
      {sucio && (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={descartar}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
          >
            <FiX size={13} /> Descartar
          </button>
          <button
            onClick={confirmar}
            disabled={isPending}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-[0.97] transition disabled:opacity-50"
          >
            <FiCheck size={13} /> {isPending ? 'Guardando...' : 'Confirmar'}
          </button>
        </div>
      )}
    </div>
  )
}

// Borrador: nada se escribe en la base hasta confirmar.
function NuevoFollowup({ leadId, fase, onCerrar }: { leadId: number; fase: Fase; onCerrar: () => void }) {
  const [isPending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(hoyInput)
  const [mensaje, setMensaje] = useState('')

  const confirmar = () =>
    startTransition(async () => {
      await registrarSeguimiento(leadId, fase, mensaje, fromDateInput(fecha))
      onCerrar()
    })

  return (
    <div className="rounded-xl border border-dashed border-foreground/30 bg-foreground/[0.03] p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted">Nuevo seguimiento</span>
        <input
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
          if (e.key === 'Escape') onCerrar()
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) confirmar()
        }}
        rows={2}
        disabled={isPending}
        placeholder="Mensaje del seguimiento que mandaste..."
        className={`${inputCls} resize-y text-sm disabled:opacity-50`}
      />
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onCerrar}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
        >
          <FiX size={13} /> Cancelar
        </button>
        <button
          onClick={confirmar}
          disabled={isPending}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-[0.97] transition disabled:opacity-50"
        >
          <FiCheck size={13} /> {isPending ? 'Guardando...' : 'Confirmar'}
        </button>
      </div>
    </div>
  )
}

export function FollowupsEditor({ leadId, followups }: { leadId: number; followups: Followup[] }) {
  const [nuevaFase, setNuevaFase] = useState<Fase | null>(null)

  return (
    <div className="flex flex-col gap-5">
      {FASES.map((fase) => {
        const items = followups
          .filter((f) => f.fase === fase)
          .sort((a, b) => a.indice - b.indice)
        const abriendo = nuevaFase === fase
        // El borrador ocupa un lugar: no ofrece agregar de más.
        const puedeAgregar = items.length + (abriendo ? 1 : 0) < FASE_MAX[fase as Fase]
        return (
          <div key={fase} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {FASE_LABEL[fase as Fase]}
                <span className="ml-1.5 text-xs font-normal text-muted">{items.length}/{FASE_MAX[fase as Fase]}</span>
              </h3>
              {puedeAgregar && (
                <button
                  onClick={() => setNuevaFase(fase as Fase)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-muted hover:text-foreground hover:bg-foreground/5 border border-dashed border-border transition-colors"
                >
                  <FiPlus size={12} /> Agregar
                </button>
              )}
            </div>

            {items.length === 0 && !abriendo && <p className="text-xs text-muted">Sin seguimientos.</p>}
            {items.map((f) => (
              <FollowupItem key={f.id} f={f} leadId={leadId} />
            ))}
            {abriendo && (
              <NuevoFollowup leadId={leadId} fase={fase as Fase} onCerrar={() => setNuevaFase(null)} />
            )}
          </div>
        )
      })}
    </div>
  )
}
