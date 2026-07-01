'use client'

import { useState, useTransition } from 'react'
import { Lead, Owner, Followup } from '@/lib/supabase'
import {
  ETAPAS, ETAPA_LABEL, ETAPA_FECHA, FASES, FASE_LABEL, FASE_MAX,
  type Etapa, type Fase,
} from '@/lib/pipeline-stages'
import {
  cambiarEtapa, actualizarFecha, actualizarCampos,
  agregarOwner, actualizarOwner, eliminarOwner,
  agregarFollowup, actualizarFollowup, eliminarFollowup,
} from '@/lib/pipeline'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FiChevronDown, FiPlus, FiTrash2 } from 'react-icons/fi'

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted'

// yyyy-mm-dd en horario de Argentina (para <input type="date">)
const toDateInput = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(iso)) : ''
const fromDateInput = (d: string) => (d ? `${d}T12:00:00-03:00` : null)

// ── Tri-state Sí / No / — ────────────────────────────────────────────────────
function TriToggle({ value, onChange, disabled }: { value: boolean | null; onChange: (v: boolean | null) => void; disabled?: boolean }) {
  const opts: { v: boolean | null; l: string }[] = [
    { v: true, l: 'Sí' }, { v: false, l: 'No' }, { v: null, l: '—' },
  ]
  return (
    <div className="inline-flex rounded-xl border border-border overflow-hidden">
      {opts.map((o) => (
        <button
          key={o.l}
          type="button"
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={`px-3 py-1.5 text-sm transition-colors ${
            value === o.v ? 'bg-foreground text-background font-semibold' : 'text-muted hover:bg-foreground/5'
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
        {lead.tiene_web === true && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted">¿Web mejorable?</span>
            <TriToggle value={lead.web_mejorable} onChange={(v) => save({ web_mejorable: v })} />
          </div>
        )}
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
export function FollowupsEditor({ leadId, followups }: { leadId: number; followups: Followup[] }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-5">
      {FASES.map((fase) => {
        const items = followups
          .filter((f) => f.fase === fase)
          .sort((a, b) => a.indice - b.indice)
        const puedeAgregar = items.length < FASE_MAX[fase as Fase]
        return (
          <div key={fase} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {FASE_LABEL[fase as Fase]}
                <span className="ml-1.5 text-xs font-normal text-muted">{items.length}/{FASE_MAX[fase as Fase]}</span>
              </h3>
              {puedeAgregar && (
                <button
                  onClick={() => startTransition(() => agregarFollowup(leadId, fase))}
                  disabled={isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg text-muted hover:text-foreground hover:bg-foreground/5 border border-dashed border-border transition-colors"
                >
                  <FiPlus size={12} /> Agregar
                </button>
              )}
            </div>

            {items.length === 0 ? (
              <p className="text-xs text-muted">Sin seguimientos.</p>
            ) : (
              items.map((f) => (
                <div key={f.id} className="rounded-xl border border-border bg-card/50 p-3 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-muted">#{f.indice}</span>
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 text-xs text-muted cursor-pointer">
                        <input
                          type="checkbox"
                          defaultChecked={f.enviado}
                          onChange={(e) => startTransition(() => actualizarFollowup(f.id, leadId, { enviado: e.target.checked }))}
                          className="accent-foreground"
                        />
                        Enviado
                      </label>
                      <input
                        type="date"
                        defaultValue={toDateInput(f.fecha)}
                        onChange={(e) => startTransition(() => actualizarFollowup(f.id, leadId, { fecha: fromDateInput(e.target.value) }))}
                        className="px-2 py-1 text-xs rounded-lg border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand"
                      />
                      <button
                        onClick={() => startTransition(() => eliminarFollowup(f.id, leadId))}
                        disabled={isPending}
                        title="Eliminar seguimiento"
                        className="grid place-items-center h-7 w-7 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                      >
                        <FiTrash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <textarea
                    defaultValue={f.mensaje || ''}
                    onBlur={(e) => startTransition(() => actualizarFollowup(f.id, leadId, { mensaje: e.target.value.trim() || null }))}
                    rows={2}
                    placeholder="Mensaje del seguimiento..."
                    className={`${inputCls} resize-y text-sm`}
                  />
                </div>
              ))
            )}
          </div>
        )
      })}
    </div>
  )
}
