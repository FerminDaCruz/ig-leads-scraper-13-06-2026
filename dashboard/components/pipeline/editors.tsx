'use client'

import { useState, useTransition } from 'react'
import { Lead, Owner, Followup } from '@/lib/supabase'
import {
  ETAPAS, ETAPA_LABEL, ETAPA_FECHA, FASES, FASE_LABEL, FASE_MAX,
  RESULTADOS, RESULTADO_LABEL,
  CANALES, CANAL_LABEL, MOTIVOS_CANAL, MOTIVO_CANAL_LABEL,
  type Etapa, type Fase, type Resultado, type Canal, type MotivoCanal,
} from '@/lib/pipeline-stages'
import {
  cambiarEtapa, actualizarFecha, actualizarCampos, marcarResultado, marcarVisto, cambiarCanal,
  agregarOwner, actualizarOwner, eliminarOwner,
  registrarSeguimiento, actualizarFollowup, eliminarFollowup,
} from '@/lib/pipeline'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { FiChevronDown, FiPlus, FiTrash2, FiSlash, FiXOctagon, FiThumbsDown, FiCheck, FiX, FiEye, FiEyeOff } from 'react-icons/fi'

const RES_ICON: Record<Resultado, typeof FiSlash> = {
  no_interesado: FiThumbsDown,
  bloqueado: FiXOctagon,
  no_recibe_mensajes: FiSlash,
}

const inputCls =
  'w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted'
const dateCls =
  'px-2.5 py-1.5 text-sm rounded-lg border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-50'

// yyyy-mm-dd en horario de Argentina (para <input type="date">)
const toDateInput = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date(iso)) : ''
const fromDateInput = (d: string) => (d ? `${d}T12:00:00-03:00` : null)
const hoyInput = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' }).format(new Date())

// ── Borrador ─────────────────────────────────────────────────────────────────
// Todas las cards editan en local y no tocan la base hasta Confirmar. Además de
// dar marcha atrás, evita que cada tecla/clic dispare un revalidate que
// re-renderiza la página (que es lo que cerraba el calendario al cambiar de mes).
function useBorrador() {
  const [isPending, startTransition] = useTransition()
  const [guardado, setGuardado] = useState(false)

  const guardar = (fn: () => Promise<void>) =>
    startTransition(async () => {
      await fn()
      setGuardado(true)
      setTimeout(() => setGuardado(false), 2000)
    })

  return { isPending, guardado, guardar }
}

function AccionesBorrador({
  sucio, isPending, guardado, onConfirmar, onDescartar,
}: {
  sucio: boolean
  isPending: boolean
  guardado: boolean
  onConfirmar: () => void
  onDescartar: () => void
}) {
  if (!sucio) {
    return guardado ? (
      <div className="flex items-center justify-end">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
          <FiCheck size={13} /> Guardado
        </span>
      </div>
    ) : null
  }
  return (
    <div className="flex items-center justify-end gap-2 pt-1">
      <span className="mr-auto text-xs text-muted">Sin guardar</span>
      <button
        onClick={onDescartar}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-medium text-muted hover:text-foreground hover:bg-foreground/5 transition-colors disabled:opacity-50"
      >
        <FiX size={13} /> Descartar
      </button>
      <button
        onClick={onConfirmar}
        disabled={isPending}
        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold bg-foreground text-background hover:opacity-90 active:scale-[0.97] transition disabled:opacity-50"
      >
        <FiCheck size={13} /> {isPending ? 'Guardando...' : 'Confirmar'}
      </button>
    </div>
  )
}

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

// ── Etapa + resultado + fechas ───────────────────────────────────────────────
export function EtapaControl({ lead }: { lead: Lead }) {
  const { isPending, guardado, guardar } = useBorrador()

  const fechasIniciales = () => {
    const o: Record<string, string> = {}
    for (const e of ETAPAS) {
      const col = ETAPA_FECHA[e]
      if (col) o[col] = toDateInput((lead as unknown as Record<string, string | null>)[col])
    }
    return o
  }

  const [etapa, setEtapa] = useState(lead.etapa as Etapa)
  const [resultado, setResultado] = useState<Resultado | null>(lead.resultado)
  // Visto es una característica (apertura), no una etapa: toggle + su fecha.
  const [visto, setVisto] = useState(!!lead.visto_at)
  const [vistoFecha, setVistoFecha] = useState(toDateInput(lead.visto_at))
  const [fechas, setFechas] = useState<Record<string, string>>(fechasIniciales)

  const fechasBase = fechasIniciales()
  const fechasSucias = Object.keys(fechasBase).filter((c) => fechas[c] !== fechasBase[c])
  const vistoFechaSucia = visto && vistoFecha !== toDateInput(lead.visto_at)
  const sucio =
    etapa !== lead.etapa ||
    resultado !== lead.resultado ||
    visto !== !!lead.visto_at ||
    vistoFechaSucia ||
    fechasSucias.length > 0

  const descartar = () => {
    setEtapa(lead.etapa as Etapa)
    setResultado(lead.resultado)
    setVisto(!!lead.visto_at)
    setVistoFecha(toDateInput(lead.visto_at))
    setFechas(fechasIniciales())
  }

  const confirmar = () =>
    guardar(async () => {
      // La etapa primero: al avanzar puede completar su fecha sola, y las fechas
      // explícitas de abajo tienen que poder pisarla.
      if (etapa !== lead.etapa) await cambiarEtapa(lead.id, etapa)
      if (resultado !== lead.resultado) await marcarResultado(lead.id, resultado)
      // Visto: marcar/limpiar la apertura; luego la fecha explícita pisa el "ahora".
      if (visto !== !!lead.visto_at) await marcarVisto(lead.id, visto)
      if (vistoFechaSucia) await actualizarFecha(lead.id, 'visto_at', fromDateInput(vistoFecha))
      for (const col of fechasSucias) await actualizarFecha(lead.id, col, fromDateInput(fechas[col]))
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted">Etapa</span>
        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold bg-foreground text-background hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {ETAPA_LABEL[etapa] ?? etapa}
            <FiChevronDown size={14} />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Mover a etapa</DropdownMenuLabel>
            {ETAPAS.map((e) => (
              <DropdownMenuItem
                key={e}
                onClick={() => setEtapa(e)}
                className={e === etapa ? 'font-semibold text-foreground' : ''}
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
            const active = resultado === r
            const Icon = RES_ICON[r]
            return (
              <button
                key={r}
                type="button"
                disabled={isPending}
                onClick={() => setResultado(r)}
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
            onClick={() => setResultado(null)}
            className={`px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
              resultado === null ? 'bg-foreground text-background font-semibold' : 'text-muted enabled:hover:bg-foreground/5'
            }`}
          >
            Activo
          </button>
        </div>
      </div>

      {/* Visto: apertura del mensaje. Característica, no etapa: no es un avance. */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted">Visto</span>
        <div className="inline-flex rounded-xl border border-border overflow-hidden">
          {([true, false] as const).map((v) => {
            const active = visto === v
            const Icon = v ? FiEye : FiEyeOff
            return (
              <button
                key={String(v)}
                type="button"
                disabled={isPending}
                onClick={() => setVisto(v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                  active
                    ? v
                      ? 'bg-sky-500 text-white font-semibold'
                      : 'bg-foreground text-background font-semibold'
                    : 'text-muted enabled:hover:bg-foreground/5'
                }`}
              >
                <Icon size={13} /> {v ? 'Sí' : 'No'}
              </button>
            )
          })}
        </div>
        {visto && (
          <input
            type="date"
            value={vistoFecha}
            disabled={isPending}
            onChange={(e) => setVistoFecha(e.target.value)}
            className={dateCls}
          />
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
        {(ETAPAS.filter((e) => ETAPA_FECHA[e]) as Etapa[]).map((e) => {
          const col = ETAPA_FECHA[e]!
          return (
            <label key={e} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-muted shrink-0">{ETAPA_LABEL[e]}</span>
              <input
                type="date"
                value={fechas[col] ?? ''}
                disabled={isPending}
                onChange={(ev) => setFechas((f) => ({ ...f, [col]: ev.target.value }))}
                className={dateCls}
              />
            </label>
          )
        })}
      </div>

      <AccionesBorrador
        sucio={sucio}
        isPending={isPending}
        guardado={guardado}
        onConfirmar={confirmar}
        onDescartar={descartar}
      />
    </div>
  )
}

// ── Canal de contacto ────────────────────────────────────────────────────────
// Por dónde seguís vos, no por dónde fue todo: cambiarlo no toca etapa, fechas
// ni seguimientos. El motivo solo aplica si te fuiste de Instagram.
export function CanalControl({ lead }: { lead: Lead }) {
  const { isPending, guardado, guardar } = useBorrador()
  const [canal, setCanal] = useState(lead.canal as Canal)
  const [motivo, setMotivo] = useState<MotivoCanal | null>(lead.canal_motivo)

  const sucio = canal !== lead.canal || (canal !== 'instagram' && motivo !== lead.canal_motivo)

  const descartar = () => {
    setCanal(lead.canal as Canal)
    setMotivo(lead.canal_motivo)
  }

  const confirmar = () =>
    guardar(async () => {
      await cambiarCanal(lead.id, canal, canal === 'instagram' ? null : motivo)
    })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm text-muted">Canal</span>
        <div className="inline-flex rounded-xl border border-border overflow-hidden">
          {CANALES.map((c) => (
            <button
              key={c}
              type="button"
              disabled={isPending}
              onClick={() => setCanal(c)}
              className={`px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                canal === c ? 'bg-foreground text-background font-semibold' : 'text-muted enabled:hover:bg-foreground/5'
              }`}
            >
              {CANAL_LABEL[c]}
            </button>
          ))}
        </div>
      </div>

      {canal !== 'instagram' && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted">Motivo</span>
          <div className="inline-flex rounded-xl border border-border overflow-hidden">
            {MOTIVOS_CANAL.map((m) => (
              <button
                key={m}
                type="button"
                disabled={isPending}
                onClick={() => setMotivo(m)}
                className={`px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                  motivo === m ? 'bg-foreground text-background font-semibold' : 'text-muted enabled:hover:bg-foreground/5'
                }`}
              >
                {MOTIVO_CANAL_LABEL[m]}
              </button>
            ))}
          </div>
        </div>
      )}

      <AccionesBorrador
        sucio={sucio}
        isPending={isPending}
        guardado={guardado}
        onConfirmar={confirmar}
        onDescartar={descartar}
      />
    </div>
  )
}

// ── Campos del lead ──────────────────────────────────────────────────────────
export function LeadFieldsEditor({ lead }: { lead: Lead }) {
  const { isPending, guardado, guardar } = useBorrador()
  const [nombre, setNombre] = useState(lead.nombre_empresa || '')
  const [tieneWeb, setTieneWeb] = useState(lead.tiene_web)
  const [webMejorable, setWebMejorable] = useState(lead.web_mejorable)
  const [activoRedes, setActivoRedes] = useState(lead.activo_redes)
  const [notas, setNotas] = useState(lead.notas || '')

  const sucio =
    nombre.trim() !== (lead.nombre_empresa || '').trim() ||
    tieneWeb !== lead.tiene_web ||
    webMejorable !== lead.web_mejorable ||
    activoRedes !== lead.activo_redes ||
    notas.trim() !== (lead.notas || '').trim()

  const descartar = () => {
    setNombre(lead.nombre_empresa || '')
    setTieneWeb(lead.tiene_web)
    setWebMejorable(lead.web_mejorable)
    setActivoRedes(lead.activo_redes)
    setNotas(lead.notas || '')
  }

  // Todos los campos en un solo update.
  const confirmar = () =>
    guardar(async () => {
      await actualizarCampos(lead.id, {
        nombre_empresa: nombre.trim() || null,
        tiene_web: tieneWeb,
        web_mejorable: webMejorable,
        activo_redes: activoRedes,
        notas: notas.trim() || null,
      })
    })

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Nombre de la empresa</span>
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          disabled={isPending}
          className={inputCls}
          placeholder={`@${lead.username}`}
        />
      </label>

      <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">¿Tiene web?</span>
          <TriToggle
            value={tieneWeb}
            disabled={isPending}
            onChange={(v) => {
              setTieneWeb(v)
              // Sin web, la mejora no aplica (el server hace lo mismo).
              if (v === false) setWebMejorable(null)
            }}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm ${tieneWeb === true ? 'text-muted' : 'text-muted/50'}`}>¿Web mejorable?</span>
          <TriToggle
            value={webMejorable}
            onChange={setWebMejorable}
            disabled={isPending || tieneWeb !== true}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">¿Activo en redes?</span>
          <TriToggle value={activoRedes} onChange={setActivoRedes} disabled={isPending} />
        </div>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-sm text-muted">Notas</span>
        <textarea
          value={notas}
          onChange={(e) => setNotas(e.target.value)}
          rows={4}
          disabled={isPending}
          className={`${inputCls} resize-y`}
          placeholder="Notas del lead..."
        />
      </label>

      <AccionesBorrador
        sucio={sucio}
        isPending={isPending}
        guardado={guardado}
        onConfirmar={confirmar}
        onDescartar={descartar}
      />
    </div>
  )
}

// ── Dueños ───────────────────────────────────────────────────────────────────
function OwnerItem({ o, leadId }: { o: Owner; leadId: number }) {
  const { isPending, guardado, guardar } = useBorrador()
  const [nombre, setNombre] = useState(o.nombre || '')
  const [numero, setNumero] = useState(o.numero || '')

  const sucio = nombre !== (o.nombre || '') || numero !== (o.numero || '')
  const descartar = () => {
    setNombre(o.nombre || '')
    setNumero(o.numero || '')
  }
  const confirmar = () => guardar(async () => { await actualizarOwner(o.id, leadId, nombre, numero) })

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder="Nombre"
          disabled={isPending}
          className={`${inputCls} flex-1 min-w-[120px]`}
        />
        <input
          value={numero}
          onChange={(e) => setNumero(e.target.value)}
          placeholder="Teléfono"
          disabled={isPending}
          className={`${inputCls} flex-1 min-w-[120px]`}
        />
        <button
          onClick={() => guardar(async () => { await eliminarOwner(o.id, leadId) })}
          disabled={isPending}
          title="Eliminar dueño"
          className="grid place-items-center h-9 w-9 rounded-xl text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 disabled:opacity-50"
        >
          <FiTrash2 size={15} />
        </button>
      </div>
      <AccionesBorrador
        sucio={sucio}
        isPending={isPending}
        guardado={guardado}
        onConfirmar={confirmar}
        onDescartar={descartar}
      />
    </div>
  )
}

export function OwnersEditor({ leadId, owners }: { leadId: number; owners: Owner[] }) {
  const { isPending, guardar } = useBorrador()
  const [nombre, setNombre] = useState('')
  const [numero, setNumero] = useState('')

  const add = () => {
    if (!nombre.trim() && !numero.trim()) return
    guardar(async () => {
      await agregarOwner(leadId, nombre, numero)
      setNombre('')
      setNumero('')
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {owners.length === 0 && <p className="text-sm text-muted">Sin dueños cargados.</p>}
      {owners.map((o) => (
        <OwnerItem key={o.id} o={o} leadId={leadId} />
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
function FollowupItem({ f, leadId }: { f: Followup; leadId: number }) {
  const { isPending, guardado, guardar } = useBorrador()
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
    guardar(async () => {
      await actualizarFollowup(f.id, leadId, {
        mensaje: mensaje.trim() || null,
        fecha: fromDateInput(fecha),
        enviado,
      })
    })

  return (
    <div className={`rounded-xl border bg-card/50 p-3 flex flex-col gap-2 transition-colors ${sucio ? 'border-foreground/30' : 'border-border'}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted">#{f.indice}</span>
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
            onClick={() => guardar(async () => { await eliminarFollowup(f.id, leadId) })}
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
      <AccionesBorrador
        sucio={sucio}
        isPending={isPending}
        guardado={guardado}
        onConfirmar={confirmar}
        onDescartar={descartar}
      />
    </div>
  )
}

// Borrador: nada se escribe en la base hasta confirmar.
function NuevoFollowup({
  leadId, fase, canal, onCerrar,
}: {
  leadId: number
  fase: Fase
  canal: Canal
  onCerrar: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [fecha, setFecha] = useState(hoyInput)
  const [mensaje, setMensaje] = useState('')

  const confirmar = () =>
    startTransition(async () => {
      await registrarSeguimiento(leadId, fase, canal, mensaje, fromDateInput(fecha))
      onCerrar()
    })

  return (
    <div className="rounded-xl border border-dashed border-foreground/30 bg-foreground/[0.03] p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-muted">Nuevo seguimiento por {CANAL_LABEL[canal]}</span>
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
        placeholder={canal === 'llamada' ? 'Cómo fue la llamada...' : 'Mensaje del seguimiento que mandaste...'}
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

export function FollowupsEditor({
  leadId, canal, followups,
}: {
  leadId: number
  /** Canal activo del lead. Solo define qué se ve al entrar: la vista se cambia sin mudarlo. */
  canal: Canal
  followups: Followup[]
}) {
  // Qué canal estás MIRANDO. Cambiarlo no toca el canal del lead: sirve para ver
  // (y anotar) lo de Instagram o una llamada sin mudar el lead de canal.
  const [vista, setVista] = useState<Canal>(canal)
  const [nuevaFase, setNuevaFase] = useState<Fase | null>(null)

  const porCanal = (c: Canal) => followups.filter((f) => f.canal === c)

  return (
    <div className="flex flex-col gap-5">
      {/* Vista por canal (no cambia el canal del lead) */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex rounded-xl border border-border overflow-hidden">
          {CANALES.map((c) => {
            const n = porCanal(c).length
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setVista(c)
                  setNuevaFase(null)
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm transition-colors ${
                  vista === c ? 'bg-foreground text-background font-semibold' : 'text-muted hover:bg-foreground/5'
                }`}
              >
                {CANAL_LABEL[c]}
                <span className={`text-xs tnum ${vista === c ? 'text-background/70' : 'text-muted'}`}>{n}</span>
              </button>
            )
          })}
        </div>
        <span className="text-xs text-muted">
          {vista === canal ? 'Canal activo del lead' : `Solo mirando · el lead sigue en ${CANAL_LABEL[canal]}`}
        </span>
      </div>

      {FASES.map((fase) => {
        // El cupo de cada fase se cuenta por canal: lo mandado por Instagram no
        // consume el cupo de WhatsApp.
        const items = porCanal(vista)
          .filter((f) => f.fase === fase)
          .sort((a, b) => a.indice - b.indice)
        const abriendo = nuevaFase === fase
        const puedeAgregar = items.length + (abriendo ? 1 : 0) < FASE_MAX[fase as Fase]
        return (
          <div key={fase} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">
                {FASE_LABEL[fase as Fase]}
                <span className="ml-1.5 text-xs font-normal text-muted">
                  {items.length}/{FASE_MAX[fase as Fase]}
                </span>
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

            {items.length === 0 && !abriendo && (
              <p className="text-xs text-muted">Sin seguimientos por {CANAL_LABEL[vista]}.</p>
            )}
            {items.map((f) => (
              <FollowupItem key={f.id} f={f} leadId={leadId} />
            ))}
            {abriendo && (
              <NuevoFollowup
                leadId={leadId}
                fase={fase as Fase}
                canal={vista}
                onCerrar={() => setNuevaFase(null)}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
