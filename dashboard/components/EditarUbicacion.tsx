'use client'

import { useState, useTransition } from 'react'
import { actualizarUbicacion } from '@/lib/actions'
import { LOCATIONS } from '@/lib/constants'
import { FiMapPin, FiPlus, FiCheck, FiX } from 'react-icons/fi'

// Celda de ubicación: si el lead ya tiene ubicación la muestra; si no, ofrece
// un editor para asignarle una (solo para leads sin ubicación por error).
export function EditarUbicacion({ leadId, ubicacion }: { leadId: number; ubicacion: string }) {
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState('')
  const [isPending, startTransition] = useTransition()

  if (ubicacion) {
    return <span className="text-navy dark:text-cream/80">{ubicacion}</span>
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md text-muted hover:text-foreground hover:bg-foreground/5 border border-dashed border-border transition-colors"
        title="Añadir ubicación"
      >
        <FiPlus size={12} /> Ubicación
      </button>
    )
  }

  const guardar = () => {
    const v = value.trim()
    if (!v) return
    startTransition(() => actualizarUbicacion(leadId, v))
  }

  return (
    <div className="flex items-center gap-1">
      <div className="relative flex items-center">
        <FiMapPin size={12} className="absolute left-2 text-muted pointer-events-none" />
        <input
          list="ubicaciones-conocidas"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') guardar()
            if (e.key === 'Escape') setEditing(false)
          }}
          autoFocus
          placeholder="Ubicación..."
          disabled={isPending}
          className="w-32 pl-6 pr-2 py-1 text-xs rounded-md border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand"
        />
        <datalist id="ubicaciones-conocidas">
          {LOCATIONS.map((loc) => (
            <option key={loc} value={loc} />
          ))}
        </datalist>
      </div>
      <button
        onClick={guardar}
        disabled={isPending || !value.trim()}
        className="grid place-items-center h-6 w-6 rounded-md bg-foreground text-background disabled:opacity-40 transition-opacity"
        title="Guardar"
      >
        <FiCheck size={13} />
      </button>
      <button
        onClick={() => setEditing(false)}
        disabled={isPending}
        className="grid place-items-center h-6 w-6 rounded-md text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
        title="Cancelar"
      >
        <FiX size={13} />
      </button>
    </div>
  )
}
