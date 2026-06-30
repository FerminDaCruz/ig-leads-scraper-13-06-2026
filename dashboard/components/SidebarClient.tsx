'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SiInstagram } from 'react-icons/si'
import { FiCheckSquare, FiSend, FiClock, FiBarChart2, FiTrendingUp, FiSliders, FiLogOut, FiSun, FiMoon, FiChevronLeft, FiChevronsRight } from 'react-icons/fi'
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
  { href: '/metricas',  label: 'Métricas',   icon: FiTrendingUp,  countKey: null                  },
  { href: '/scraper',   label: 'Scraper',    icon: FiSliders,     countKey: null                  },
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

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark')

  return (
    <>
      {/* ───────────── Isla lateral · escritorio (lg+) ───────────── */}
      <aside
        className={`hidden lg:flex sticky top-3 self-start h-[calc(100dvh-1.5rem)] m-3 shrink-0 flex-col rounded-3xl glass-island overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          expanded ? 'w-60' : 'w-[4.5rem]'
        }`}
      >
        {/* Cabecera */}
        <div className="flex items-center h-16 px-4 shrink-0 gap-2.5 border-b border-border/60">
          {expanded ? (
            <>
              <span className="grid place-items-center h-8 w-8 rounded-xl bg-foreground text-background shrink-0">
                <SiInstagram size={16} />
              </span>
              <span className="font-semibold text-[0.95rem] tracking-tight text-foreground flex-1 truncate">
                IG Leads
              </span>
              <button
                onClick={toggle}
                className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
                title="Colapsar"
                aria-label="Colapsar menú"
              >
                <FiChevronLeft size={16} />
              </button>
            </>
          ) : (
            // Colapsado: el slot del logo es el botón para expandir; al hover muestra la flecha
            <button
              onClick={toggle}
              title="Expandir"
              aria-label="Expandir menú"
              className="group relative grid place-items-center h-8 w-8 mx-auto rounded-xl bg-foreground text-background shrink-0"
            >
              <SiInstagram size={16} className="[grid-area:1/1] transition-opacity duration-150 group-hover:opacity-0" />
              <FiChevronsRight size={17} className="[grid-area:1/1] opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </button>
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 p-2.5 flex flex-col gap-1 overflow-y-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const active = isActive(tab.href)
            const count = tab.countKey ? counts[tab.countKey] : null
            return (
              <Link
                key={tab.href}
                href={tab.href}
                title={!expanded ? tab.label : undefined}
                aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? 'bg-foreground/[0.07] text-foreground font-semibold'
                    : 'text-muted font-medium hover:text-foreground hover:bg-foreground/5'
                }`}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-1 rounded-full bg-foreground" />
                )}
                <Icon size={18} className="shrink-0" />
                {expanded && <span className="flex-1 truncate">{tab.label}</span>}
                {expanded && count !== null && (
                  <span className={`text-xs font-semibold tnum px-1.5 py-0.5 rounded-md ${
                    active ? 'bg-foreground text-background' : 'bg-foreground/8 text-muted'
                  }`}>
                    {count}
                  </span>
                )}
                {!expanded && count !== null && count > 0 && (
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-foreground rounded-full" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Acciones inferiores */}
        <div className="p-2.5 border-t border-border/60 flex flex-col gap-1 shrink-0">
          {mounted && (
            <button
              onClick={toggleTheme}
              title={!expanded ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-foreground hover:bg-foreground/5 transition-colors w-full text-left"
            >
              {theme === 'dark' ? <FiSun size={17} className="shrink-0" /> : <FiMoon size={17} className="shrink-0" />}
              {expanded && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
            </button>
          )}
          <form action={logout}>
            <button
              type="submit"
              title={!expanded ? 'Cerrar sesión' : undefined}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors w-full text-left"
            >
              <FiLogOut size={17} className="shrink-0" />
              {expanded && <span>Cerrar sesión</span>}
            </button>
          </form>
        </div>
      </aside>

      {/* ───────────── Cabecera flotante · móvil (<lg) ───────────── */}
      <header className="lg:hidden fixed top-3 inset-x-3 z-40 h-14 px-3.5 rounded-2xl glass-island flex items-center gap-2.5">
        <span className="grid place-items-center h-8 w-8 rounded-xl bg-foreground text-background shrink-0">
          <SiInstagram size={15} />
        </span>
        <span className="font-semibold tracking-tight text-foreground flex-1 truncate">IG Leads</span>
        {mounted && (
          <button
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            className="grid place-items-center h-9 w-9 rounded-xl text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            {theme === 'dark' ? <FiSun size={17} /> : <FiMoon size={17} />}
          </button>
        )}
        <form action={logout} className="flex">
          <button
            type="submit"
            aria-label="Cerrar sesión"
            className="grid place-items-center h-9 w-9 rounded-xl text-muted hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <FiLogOut size={17} />
          </button>
        </form>
      </header>

      {/* ───────────── Isla de pestañas inferior · móvil (<lg) ───────────── */}
      <nav className="lg:hidden fixed bottom-3 inset-x-3 z-40 h-[4.25rem] px-1 rounded-2xl glass-island grid grid-cols-6">
        {TABS.map((tab) => {
          const Icon = tab.icon
          const active = isActive(tab.href)
          const count = tab.countKey ? counts[tab.countKey] : null
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex flex-col items-center justify-center gap-1 rounded-xl my-1.5 min-w-0 transition-colors ${
                active ? 'text-foreground' : 'text-muted'
              }`}
            >
              <span className={`relative grid place-items-center h-8 w-8 rounded-xl transition-colors ${
                active ? 'bg-foreground/[0.08]' : ''
              }`}>
                <Icon size={19} />
                {count !== null && count > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[1rem] h-4 px-1 grid place-items-center text-[0.6rem] font-bold tnum rounded-full bg-foreground text-background">
                    {count > 99 ? '99' : count}
                  </span>
                )}
              </span>
              <span className={`text-[0.6rem] leading-none tracking-tight max-w-full truncate px-0.5 ${active ? 'font-semibold' : 'font-medium'}`}>
                {tab.label}
              </span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}
