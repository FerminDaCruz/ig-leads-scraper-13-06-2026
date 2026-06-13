import Link from 'next/link'
import { getSupabase } from '@/lib/supabase'

export async function Nav({ active }: { active: 'calificar' | 'contactar' | 'historial' }) {
  const supabase = getSupabase()

  const [pendientesRes, contactarRes] = await Promise.all([
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .is('calificado', null),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('calificado', true)
      .eq('contactado', false),
  ])

  const pendientes = pendientesRes.count ?? 0
  const listos = contactarRes.count ?? 0

  const tabs = [
    { href: '/', label: 'Calificar', id: 'calificar', count: pendientes },
    { href: '/contactar', label: 'Contactar', id: 'contactar', count: listos },
    { href: '/historial', label: 'Historial', id: 'historial', count: null },
  ]

  return (
    <nav className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 flex gap-1 py-3">
        <span className="text-gray-800 font-bold mr-6 self-center text-lg">📸 IG Leads</span>
        {tabs.map((tab) => (
          <Link
            key={tab.id}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              active === tab.id
                ? 'bg-indigo-600 text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab.label}
            {tab.count !== null && (
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  active === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {tab.count}
              </span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
