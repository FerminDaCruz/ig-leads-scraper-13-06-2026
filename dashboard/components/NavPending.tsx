'use client'

import { createContext, useContext, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * Cambiar un filtro re-consulta en el server, pero `loading.tsx` no se muestra:
 * la ruta no cambia, solo sus searchParams. Sin esto la pantalla queda congelada
 * con los datos viejos y sin señal. El provider envuelve esas navegaciones en una
 * transición; `PendingDim` atenúa los datos viejos mientras el server responde.
 *
 * Se atenúan solo los resultados, no los filtros: el filtro tiene que seguir
 * legible y usable (el buscador, sin ir más lejos, se escribe mientras carga).
 */
const NavPendingCtx = createContext<{
  pending: boolean
  navigate: (href: string) => void
}>({ pending: false, navigate: () => {} })

export function useNavPending() {
  return useContext(NavPendingCtx)
}

export function NavPendingProvider({ children }: { children: React.ReactNode }) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const navigate = (href: string) => startTransition(() => router.push(href))

  return (
    <NavPendingCtx.Provider value={{ pending, navigate }}>{children}</NavPendingCtx.Provider>
  )
}

/** Envuelve la zona de datos de una página: se atenúa mientras hay un filtro en vuelo. */
export function PendingDim({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  const { pending } = useNavPending()

  return (
    <div
      aria-busy={pending}
      className={`transition-opacity duration-200 motion-reduce:transition-none ${
        pending ? 'opacity-40 pointer-events-none' : 'opacity-100'
      } ${className || ''}`}
    >
      {children}
    </div>
  )
}

/**
 * Link de filtro (tabs, chips). Mantiene el href real —prefetch, click medio y
 * ctrl/cmd+click siguen funcionando— pero el click normal pasa por la transición.
 */
export function FilterLink({
  href,
  className,
  children,
}: {
  href: string
  className?: string
  children: React.ReactNode
}) {
  const { navigate } = useNavPending()

  return (
    <Link
      href={href}
      className={className}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return
        e.preventDefault()
        navigate(href)
      }}
    >
      {children}
    </Link>
  )
}
