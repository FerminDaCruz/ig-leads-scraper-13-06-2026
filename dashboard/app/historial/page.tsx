export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { Nav } from '@/components/Nav'
import Link from 'next/link'

type Filtro = 'todos' | 'pendientes' | 'calificados' | 'descartados' | 'contactados'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Sin revisar' },
  { id: 'calificados', label: 'Calificados' },
  { id: 'descartados', label: 'Descartados' },
  { id: 'contactados', label: 'Contactados' },
]

function estadoBadge(lead: Lead) {
  if (lead.contactado) return <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">Contactado</span>
  if (lead.calificado === true) return <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-semibold">Calificado</span>
  if (lead.calificado === false) return <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-semibold">Descartado</span>
  return <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold">Pendiente</span>
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>
}) {
  const { filtro } = await searchParams
  const filtroActivo = (filtro as Filtro) || 'todos'

  const supabase = getSupabase()
  let query = supabase.from('leads').select('*').order('first_seen_at', { ascending: false })

  if (filtroActivo === 'pendientes') query = query.is('calificado', null)
  else if (filtroActivo === 'calificados') query = query.eq('calificado', true).eq('contactado', false)
  else if (filtroActivo === 'descartados') query = query.eq('calificado', false)
  else if (filtroActivo === 'contactados') query = query.eq('contactado', true)

  const { data: leads, count } = await query.limit(500)
  const rows = (leads || []) as Lead[]

  return (
    <>
      <Nav active="historial" />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Historial</h1>
          <p className="text-gray-500 text-sm mt-1">{rows.length} leads</p>
        </div>

        <div className="flex gap-2 mb-4">
          {FILTROS.map((f) => (
            <Link
              key={f.id}
              href={`/historial?filtro=${f.id}`}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                filtroActivo === f.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50">
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Usuario</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Nicho</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Ubicación</th>
                <th className="text-center px-4 py-3 text-gray-600 font-semibold">Veces</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 font-semibold">Agregado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((lead) => (
                <tr key={lead.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <a
                      href={lead.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
                    >
                      @{lead.username}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                    {lead.nichos || '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[160px] truncate">
                    {lead.ubicaciones || '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                      {lead.veces_encontrado}
                    </span>
                  </td>
                  <td className="px-4 py-3">{estadoBadge(lead)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(lead.first_seen_at).toLocaleDateString('es-AR')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </>
  )
}
