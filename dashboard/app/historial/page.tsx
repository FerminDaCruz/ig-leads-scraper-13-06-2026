export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { Nav } from '@/components/Nav'
import { LocationFilter } from '@/components/LocationFilter'
import Link from 'next/link'
import { Suspense } from 'react'

type Filtro = 'todos' | 'pendientes' | 'calificados' | 'descartados' | 'contactados'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'pendientes', label: 'Sin revisar' },
  { id: 'calificados', label: 'Calificados' },
  { id: 'descartados', label: 'Descartados' },
  { id: 'contactados', label: 'Contactados' },
]

function EstadoBadge({ lead }: { lead: Lead }) {
  if (lead.contactado)
    return <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-xs font-semibold">Contactado</span>
  if (lead.calificado === true)
    return <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 text-xs font-semibold">Calificado</span>
  if (lead.calificado === false)
    return <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 text-xs font-semibold">Descartado</span>
  return <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-xs font-semibold">Pendiente</span>
}

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string; ubicacion?: string; ocultar?: string | string[] }>
}) {
  const { filtro, ubicacion, ocultar: ocultarRaw } = await searchParams
  const filtroActivo = (filtro as Filtro) || 'todos'
  const ocultar = ocultarRaw ? (Array.isArray(ocultarRaw) ? ocultarRaw : [ocultarRaw]) : []

  const supabase = getSupabase()
  let query = supabase.from('leads').select('*').order('first_seen_at', { ascending: false })

  if (filtroActivo === 'pendientes') query = query.is('calificado', null)
  else if (filtroActivo === 'calificados') query = query.eq('calificado', true).eq('contactado', false)
  else if (filtroActivo === 'descartados') query = query.eq('calificado', false)
  else if (filtroActivo === 'contactados') query = query.eq('contactado', true)

  if (ubicacion) query = query.ilike('ubicaciones', `%${ubicacion}%`)
  for (const loc of ocultar) query = query.not('ubicaciones', 'ilike', `%${loc}%`)

  const { data: leads } = await query.limit(500)
  const rows = (leads || []) as Lead[]

  return (
    <>
      <Nav active="historial" />
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Historial</h1>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{rows.length} leads</p>
          </div>
          <Suspense>
            <LocationFilter />
          </Suspense>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {FILTROS.map((f) => {
            const params = new URLSearchParams()
            params.set('filtro', f.id)
            if (ubicacion) params.set('ubicacion', ubicacion)
            ocultar.forEach((v) => params.append('ocultar', v))
            return (
              <Link
                key={f.id}
                href={`/historial?${params.toString()}`}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  filtroActivo === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Usuario</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Nicho</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Ubicación</th>
                <th className="text-center px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Veces</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Estado</th>
                <th className="text-left px-4 py-3 text-gray-600 dark:text-gray-400 font-semibold">Agregado</th>
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
                    <EstadoBadge lead={lead} />
                  </td>
                  <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
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
