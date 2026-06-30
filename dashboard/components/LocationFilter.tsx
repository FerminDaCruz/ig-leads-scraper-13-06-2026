'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FiMapPin, FiEyeOff, FiX } from 'react-icons/fi'
import { LOCATIONS } from '@/lib/constants'

const selectClass =
  'py-2 text-sm rounded-lg border bg-white dark:bg-navy-card text-navy dark:text-cream appearance-none focus:outline-none focus:ring-2 focus:ring-brand border-surface dark:border-navy-border'

export function LocationFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const ubicacion = searchParams.get('ubicacion') || ''
  const ocultar = searchParams.getAll('ocultar')

  const buildParams = (overrides: { ubicacion?: string; ocultar?: string[] }) => {
    const params = new URLSearchParams()
    const u = overrides.ubicacion !== undefined ? overrides.ubicacion : ubicacion
    const o = overrides.ocultar !== undefined ? overrides.ocultar : ocultar
    if (u) params.set('ubicacion', u)
    o.forEach((v) => params.append('ocultar', v))
    return params.toString()
  }

  const setUbicacion = (v: string) => router.push(`${pathname}?${buildParams({ ubicacion: v })}`)
  const addOcultar = (v: string) => {
    if (!v || ocultar.includes(v)) return
    router.push(`${pathname}?${buildParams({ ocultar: [...ocultar, v] })}`)
  }
  const removeOcultar = (v: string) =>
    router.push(`${pathname}?${buildParams({ ocultar: ocultar.filter((x) => x !== v) })}`)

  const availableToHide = LOCATIONS.filter((l) => !ocultar.includes(l))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filtrar por ubicación */}
      <div className="relative flex items-center">
        <FiMapPin size={14} className="absolute left-3 text-muted pointer-events-none" />
        <select
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          className={`${selectClass} pl-8 pr-3`}
        >
          <option value="">Todas las ubicaciones</option>
          {availableToHide.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {ubicacion && (
        <button
          onClick={() => setUbicacion('')}
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-brand/20 text-navy dark:text-brand hover:bg-brand/30 transition-colors"
        >
          <FiX size={12} /> {ubicacion}
        </button>
      )}

      {/* Ocultar ubicación */}
      <div className="relative flex items-center">
        <FiEyeOff size={14} className="absolute left-3 text-muted pointer-events-none" />
        <select
          value=""
          onChange={(e) => addOcultar(e.target.value)}
          className={`${selectClass} pl-8 pr-3`}
        >
          <option value="">Ocultar ubicación...</option>
          {availableToHide.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {ocultar.map((loc) => (
        <button
          key={loc}
          onClick={() => removeOcultar(loc)}
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-navy/10 dark:bg-navy-border text-navy dark:text-cream/70 hover:bg-navy/20 dark:hover:bg-navy-card transition-colors"
          title={`Dejar de ocultar "${loc}"`}
        >
          <FiEyeOff size={12} /> {loc} <FiX size={11} />
        </button>
      ))}
    </div>
  )
}
