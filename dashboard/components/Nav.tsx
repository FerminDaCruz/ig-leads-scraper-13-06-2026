import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'
import { ThemeToggle } from './ThemeToggle'
import { SiInstagram } from 'react-icons/si'
import { FiCheckSquare, FiSend, FiClock, FiBarChart2 } from 'react-icons/fi'

export async function Nav({ active }: { active: 'calificar' | 'contactar' | 'historial' | 'stats' }) {
  const supabase = getSupabase()

  const [pendientesRes, contactarRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).is('calificado', null),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('calificado', true)
      .eq('contactado', false),
  ])

  const pendientes = pendientesRes.count ?? 0
  const listos = contactarRes.count ?? 0

  const tabs = [
    { href: '/', label: 'Calificar', id: 'calificar', count: pendientes, icon: FiCheckSquare },
    { href: '/contactar', label: 'Contactar', id: 'contactar', count: listos, icon: FiSend },
    { href: '/historial', label: 'Historial', id: 'historial', count: null, icon: FiClock },
    { href: '/stats', label: 'Reporte', id: 'stats', count: null, icon: FiBarChart2 },
  ]

  return (
    <nav className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 py-3">
        <div className="flex items-center gap-2 mr-6">
          <SiInstagram size={20} className="text-pink-500" />
          <span className="text-gray-800 dark:text-white font-bold text-lg">IG Leads</span>
        </div>

        <div className="flex gap-1 flex-1">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  active === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {tab.count !== null && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      active === tab.id
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            )
          })}
        </div>

        <ThemeToggle />
      </div>
    </nav>
  )
}
