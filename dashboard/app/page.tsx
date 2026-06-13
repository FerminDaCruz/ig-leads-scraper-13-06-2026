export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { Nav } from '@/components/Nav'
import { CalificarButtons } from '@/components/LeadActions'

export default async function CalificarPage() {
  const supabase = getSupabase()

  const { data: leads } = await supabase
    .from('leads')
    .select('*')
    .is('calificado', null)
    .order('veces_encontrado', { ascending: false })
    .limit(100)

  const rows = (leads || []) as Lead[]

  return (
    <>
      <Nav active="calificar" />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Calificar Leads</h1>
          <p className="text-gray-500 text-sm mt-1">
            {rows.length} leads pendientes de revisión · Revisá el perfil y marcá si es o no calificado
          </p>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <p className="text-xl">🎉 No hay leads pendientes de calificación</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Nicho</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Ubicación</th>
                  <th className="text-center px-4 py-3 text-gray-600 font-semibold">Veces</th>
                  <th className="text-left px-4 py-3 text-gray-600 font-semibold">Acción</th>
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
                    <td className="px-4 py-3">
                      <CalificarButtons leadId={lead.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </>
  )
}
