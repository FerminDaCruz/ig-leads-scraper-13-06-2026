'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SiInstagram } from 'react-icons/si'
import { FiCheckSquare, FiSend, FiClock, FiBarChart2, FiLogOut, FiSun, FiMoon, FiChevronLeft, FiMenu } from 'react-icons/fi'
import { logout } from '@/lib/auth'
import { useTheme } from 'next-themes'

interface Props {
  pendientes: number
  listos: number
}

const TABS = [
  { href: '/',          label: 'Calificar',  icon: FiCheckSquare, countKey: 'pendientes' as const },
  { href: '/contactar', label: 'Contactar',  icon: FiSend,        countKey: 'listos' as const     },
  { href: '/historial', label: 'Historial',  icon: FiClock,       countKey: null                  },
  { href: '/stats',     label: 'Reportes',   icon: FiBarChart2,   countKey: null                  },
]

export function SidebarClient({ pendientes, listos }: Props) {
  const [expanded, setExpanded] = useState(true)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
    const stored = localStorage.getItem('sidebar-expanded')
    if (stored !== null) setExpanded(stored === 'true')
  }, [])

  const toggle = () => {
    const next = !expanded
    setExpanded(next)
    localStorage.setItem('sidebar-expanded', String(next))
  }

  const counts = { pendientes, listos }

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <aside
      className={`bg-navy shrink-0 flex flex-col h-full border-r border-navy-border/60 transition-[width] duration-200 overflow-hidden ${
        expanded ? 'w-56' : 'w-14'
      }`}
    >
      {/* Cabecera */}
      <div className="flex items-center h-14 px-3 border-b border-navy-border/60 shrink-0 gap-2">
        <SiInstagram size={18} className="text-brand shrink-0" />
        {expanded && (
          <span className="text-white font-bold text-base flex-1 truncate">IG Leads</span>
        )}
        <button
          onClick={toggle}
          className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          title={expanded ? 'Colapsar' : 'Expandir'}
        >
          {expanded ? <FiChevronLeft size={15} /> : <FiMenu size={15} />}
        </button>
      </div>

      {/* Navegación */}
      <nav className="flex-1 p-2 flex flex-col gap-0.5 overflow-y-auto">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          const count = tab.countKey ? counts[tab.countKey] : null

          return (
            <Link
              key={tab.href}
              href={tab.href}
              title={!expanded ? tab.label : undefined}
              className={`relative flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-brand/15 text-brand'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`}
            >
              <Icon size={17} className="shrink-0" />
              {expanded && <span className="flex-1 truncate">{tab.label}</span>}
              {expanded && count !== null && (
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${
                  active ? 'bg-brand/20 text-brand' : 'bg-white/10 text-white/50'
                }`}>
                  {count}
                </span>
              )}
              {!expanded && count !== null && count > 0 && (
                <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-brand rounded-full" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Acciones inferiores */}
      <div className="p-2 border-t border-navy-border/60 flex flex-col gap-0.5 shrink-0">
        {mounted && (
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            title={!expanded ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/8 transition-colors w-full text-left"
          >
            {theme === 'dark'
              ? <FiSun size={16} className="shrink-0" />
              : <FiMoon size={16} className="shrink-0" />}
            {expanded && (
              <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>
            )}
          </button>
        )}

        <form action={logout}>
          <button
            type="submit"
            title={!expanded ? 'Cerrar sesión' : undefined}
            className="flex items-center gap-3 px-2.5 py-2 rounded-lg text-sm text-white/60 hover:text-red-400 hover:bg-white/8 transition-colors w-full text-left"
          >
            <FiLogOut size={16} className="shrink-0" />
            {expanded && <span>Cerrar sesión</span>}
          </button>
        </form>
      </div>
    </aside>
  )
}
