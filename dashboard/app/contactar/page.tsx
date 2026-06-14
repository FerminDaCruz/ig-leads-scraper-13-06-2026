export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { Nav } from '@/components/Nav'
import { ContactarButton } from '@/components/LeadActions'
import { LocationFilter } from '@/components/LocationFilter'
import { Suspense } from 'react'

export default async function ContactarPage({
  searchParams,
}: {
  searchParams: Promise<{ ubicacion?: string; ocultar?: string | string[] }>
}) {
  const params = await searchParams
  const ubicacion = params.ubicacion || ''
  const ocultar = params.ocultar ? (Array.isArray(params.ocultar) ? params.ocultar : [params.ocultar]) : []
  const supabase = getSupabase()

  let query = supabase
    .from('leads')
    .select('*')
    .eq('calificado', true)
    .eq('contactado', false)
    .order('veces_encontrado', { ascending: false })

  if (ubicacion) query = query.ilike('ubicaciones', `%${ubicacion}%`)
  for (const loc of ocultar) query = query.not('ubicaciones', 'ilike', `%${loc}%`)

  const { data: leads } = await query
  const rows = (leads || []) as Lead[]

  return (
    <>
      <Nav active="contactar" />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Contactar</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {rows.length} leads calificados listos para contactar
            </p>
          </div>
          <Suspense>
            <LocationFilter />
          </Suspense>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-500">
            <p className="text-xl font-medium">
              {ubicacion ? `Sin leads en "${ubicacion}"` : 'No hay leads listos para contactar'}
            </p>
            {!ubicacion && (
              <p className="text-sm mt-2">Calificá más leads en el panel anterior</p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Nicho</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Ubicación</th>
                  <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Veces</th>
                  <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                {rows.map((lead) => (
                  <tr key={lead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                    <td className="px-4 py-3">
                      <a
                        href={lead.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium hover:underline"
                      >
                        @{lead.username}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[180px] truncate">
                      {lead.nichos || '—'}
                    </td>
                    <td className="px-4 py-3 text-gray-700 dark:text-gray-300 max-w-[160px] truncate">
                      {lead.ubicaciones || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs font-bold">
                        {lead.veces_encontrado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ContactarButton leadId={lead.id} />
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
