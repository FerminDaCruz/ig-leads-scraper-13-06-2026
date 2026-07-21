'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { FiSearch, FiX, FiLoader } from 'react-icons/fi'
import { useNavPending } from '@/components/NavPending'

export function PipelineSearch() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { pending, navigate } = useNavPending()
  const [value, setValue] = useState(searchParams.get('q') || '')
  const first = useRef(true)

  // Debounce: actualiza la URL 300ms después de dejar de tipear,
  // preservando el resto de params (etapa, web, etc.).
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      if (value.trim()) {
        params.set('q', value.trim())
        // Buscar mira todas las etapas: si no, un lead que ya avanzó no aparece
        // aunque coincida. Al escribir, la pestaña salta a "Todos".
        params.set('etapa', 'todos')
      } else {
        params.delete('q')
      }
      navigate(`${pathname}?${params.toString()}`)
    }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <div className="relative flex items-center">
      <FiSearch size={15} className="absolute left-3 text-muted pointer-events-none" />
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Buscar por empresa o @usuario..."
        className="w-full pl-9 pr-9 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted"
      />
      {pending ? (
        <FiLoader size={14} className="absolute right-3 text-muted animate-spin" />
      ) : (
        value && (
          <button
            onClick={() => setValue('')}
            aria-label="Limpiar búsqueda"
            className="absolute right-2.5 grid place-items-center h-6 w-6 rounded-lg text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <FiX size={14} />
          </button>
        )
      )}
    </div>
  )
}
