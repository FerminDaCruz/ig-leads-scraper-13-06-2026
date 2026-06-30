'use client'

import { useState, useTransition } from 'react'
import { Niche, Location } from '@/lib/supabase'
import {
  agregarNicho,
  eliminarNicho,
  agregarUbicacion,
  eliminarUbicacion,
  toggleUbicacionOculta,
} from '@/lib/scraper-config'
import { FiPlus, FiX, FiEye, FiEyeOff } from 'react-icons/fi'

// ── Formulario de alta reutilizable ────────────────────────────────────────
function AddForm({
  placeholder,
  onAdd,
}: {
  placeholder: string
  onAdd: (value: string) => Promise<void>
}) {
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  const submit = () => {
    const v = value.trim()
    if (!v) return
    setValue('')
    startTransition(() => onAdd(v))
  }

  return (
    <div className="flex items-center gap-2">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder={placeholder}
        disabled={isPending}
        className="flex-1 min-w-0 px-3 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted"
      />
      <button
        onClick={submit}
        disabled={isPending || !value.trim()}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl bg-foreground text-background disabled:opacity-40 hover:opacity-90 active:scale-[0.97] transition shrink-0"
      >
        <FiPlus size={15} /> Agregar
      </button>
    </div>
  )
}

// ── Nichos ──────────────────────────────────────────────────────────────────
export function NicheManager({ niches }: { niches: Niche[] }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-4">
      <AddForm
        placeholder="Nuevo nicho (ej. cabañas)"
        onAdd={async (v) => agregarNicho(v)}
      />

      {niches.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay nichos cargados.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {niches.map((n) => (
            <span
              key={n.id}
              className="group inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-xl text-sm font-medium bg-card/60 backdrop-blur-sm text-foreground border border-border"
            >
              {n.name}
              <button
                onClick={() => startTransition(() => eliminarNicho(n.id))}
                disabled={isPending}
                title={`Eliminar "${n.name}"`}
                aria-label={`Eliminar ${n.name}`}
                className="grid place-items-center h-5 w-5 rounded-md text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <FiX size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Ubicaciones ───────────────────────────────────────────────────────────────
export function LocationManager({ locations }: { locations: Location[] }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-4">
      <AddForm
        placeholder="Nueva ubicación (ej. Bariloche)"
        onAdd={async (v) => agregarUbicacion(v)}
      />

      {locations.length === 0 ? (
        <p className="text-sm text-muted">Todavía no hay ubicaciones cargadas.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {locations.map((l) => (
            <span
              key={l.id}
              className={`inline-flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-xl text-sm font-medium border transition-colors ${
                l.hidden_by_default
                  ? 'bg-foreground/[0.04] text-muted border-dashed border-border'
                  : 'bg-card/60 backdrop-blur-sm text-foreground border-border'
              }`}
            >
              {l.name}
              <button
                onClick={() =>
                  startTransition(() => toggleUbicacionOculta(l.id, !l.hidden_by_default))
                }
                disabled={isPending}
                title={
                  l.hidden_by_default
                    ? 'Oculta por defecto en Calificar/Contactar — clic para mostrar'
                    : 'Visible — clic para ocultar por defecto'
                }
                aria-label={l.hidden_by_default ? 'Mostrar por defecto' : 'Ocultar por defecto'}
                className="grid place-items-center h-5 w-5 rounded-md text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
              >
                {l.hidden_by_default ? <FiEyeOff size={13} /> : <FiEye size={13} />}
              </button>
              <button
                onClick={() => startTransition(() => eliminarUbicacion(l.id))}
                disabled={isPending}
                title={`Eliminar "${l.name}"`}
                aria-label={`Eliminar ${l.name}`}
                className="grid place-items-center h-5 w-5 rounded-md text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <FiX size={13} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
