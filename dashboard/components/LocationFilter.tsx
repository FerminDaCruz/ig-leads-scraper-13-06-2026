'use client'

import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { FiMapPin, FiEyeOff, FiX } from 'react-icons/fi'

const LOCATIONS = [
  'Argentina',
  'Bariloche',
  'Buenos Aires',
  'CABA',
  'Cafayate',
  'Cordoba',
  'El Bolson',
  'El Calafate',
  'Las Grutas',
  'Mar del Plata',
  'Mendoza',
  'Miramar',
  'Monte Hermoso',
  'Necochea',
  'Pinamar',
  'Puerto Iguazu',
  'Puerto Madryn',
  'Salta',
  'San Bernardo',
  'San Martin de los Andes',
  'San Rafael',
  'Tandil',
  'Tilcara',
  'Ushuaia',
  'Villa Carlos Paz',
  'Villa Gesell',
  'Villa La Angostura',
]

export function LocationFilter() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const ubicacion = searchParams.get('ubicacion') || ''
  const ocultar = searchParams.getAll('ocultar')

  const buildParams = (overrides: { ubicacion?: string; ocultar?: string[] }) => {
    const params = new URLSearchParams()
    const newUbicacion = overrides.ubicacion !== undefined ? overrides.ubicacion : ubicacion
    const newOcultar = overrides.ocultar !== undefined ? overrides.ocultar : ocultar
    if (newUbicacion) params.set('ubicacion', newUbicacion)
    newOcultar.forEach((v) => params.append('ocultar', v))
    return params.toString()
  }

  const setUbicacion = (value: string) =>
    router.push(`${pathname}?${buildParams({ ubicacion: value })}`)

  const addOcultar = (value: string) => {
    if (ocultar.includes(value) || value === ubicacion) return
    router.push(`${pathname}?${buildParams({ ocultar: [...ocultar, value] })}`)
  }

  const removeOcultar = (value: string) =>
    router.push(`${pathname}?${buildParams({ ocultar: ocultar.filter((v) => v !== value) })}`)

  const availableToHide = LOCATIONS.filter((l) => !ocultar.includes(l))

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filtrar por ubicación */}
      <div className="relative flex items-center">
        <FiMapPin size={14} className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <select
          value={ubicacion}
          onChange={(e) => setUbicacion(e.target.value)}
          className="pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Todas las ubicaciones</option>
          {LOCATIONS.filter((l) => !ocultar.includes(l)).map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {ubicacion && (
        <button
          onClick={() => setUbicacion('')}
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
        >
          <FiX size={12} />
          {ubicacion}
        </button>
      )}

      {/* Ocultar ubicación */}
      <div className="relative flex items-center">
        <FiEyeOff size={14} className="absolute left-3 text-gray-400 dark:text-gray-500 pointer-events-none" />
        <select
          value=""
          onChange={(e) => { if (e.target.value) addOcultar(e.target.value) }}
          className="pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 appearance-none focus:outline-none focus:ring-2 focus:ring-orange-400"
        >
          <option value="">Ocultar ubicación...</option>
          {availableToHide.map((loc) => (
            <option key={loc} value={loc}>{loc}</option>
          ))}
        </select>
      </div>

      {/* Chips de ubicaciones ocultas */}
      {ocultar.map((loc) => (
        <button
          key={loc}
          onClick={() => removeOcultar(loc)}
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 hover:bg-orange-200 dark:hover:bg-orange-900 transition-colors"
          title={`Dejar de ocultar "${loc}"`}
        >
          <FiEyeOff size={12} />
          {loc}
          <FiX size={11} />
        </button>
      ))}
    </div>
  )
}
