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
    return <span className="px-2 py-0.5 rounded-full bg-brand/20 text-brand text-xs font-semibold">Contactado</span>
  if (lead.calificado === true)
    return <span className="px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 text-xs font-semibold">Calificado</span>
  if (lead.calificado === false)
    return <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 text-xs font-semibold">Descartado</span>
  return <span className="px-2 py-0.5 rounded-full bg-surface dark:bg-navy text-muted text-xs font-semibold">Pendiente</span>
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
            <h1 className="text-2xl font-bold text-navy dark:text-cream">Historial</h1>
            <p className="text-muted text-sm mt-1">{rows.length} leads</p>
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
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-[background-color,color] duration-150 ease-out ${
                  filtroActivo === f.id
                    ? 'bg-brand text-navy'
                    : 'bg-white dark:bg-navy-card text-muted border border-surface dark:border-navy-border hover:bg-cream dark:hover:bg-navy'
                }`}
              >
                {f.label}
              </Link>
            )
          })}
        </div>

        <div className="bg-white dark:bg-navy-card rounded-xl border border-surface dark:border-navy-border overflow-x-auto">
          <table className="w-full text-sm min-w-[480px]">
            <thead>
              <tr className="border-b border-surface dark:border-navy-border bg-surface dark:bg-navy">
                <th className="text-left px-4 py-3 text-muted font-semibold">Usuario</th>
                <th className="hidden lg:table-cell text-left px-4 py-3 text-muted font-semibold">Nicho</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Ubicación</th>
                <th className="hidden md:table-cell text-center px-4 py-3 text-muted font-semibold">Veces</th>
                <th className="text-left px-4 py-3 text-muted font-semibold">Estado</th>
                <th className="hidden md:table-cell text-left px-4 py-3 text-muted font-semibold">Agregado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface dark:divide-navy-border">
              {rows.map((lead) => (
                <tr key={lead.id} className="hover:bg-cream dark:hover:bg-navy transition-colors">
                  <td className="px-4 py-3">
                    <a href={lead.url} target="_blank" rel="noopener noreferrer"
                      className="text-brand hover:text-cyan-300 font-medium hover:underline">
                      @{lead.username}
                    </a>
                  </td>
                  <td className="hidden lg:table-cell px-4 py-3 text-navy dark:text-cream/80 max-w-[180px] truncate">{lead.nichos || '—'}</td>
                  <td className="px-4 py-3 text-navy dark:text-cream/80 max-w-[160px] truncate">{lead.ubicaciones || '—'}</td>
                  <td className="hidden md:table-cell px-4 py-3 text-center">
                    <span className="inline-block px-2 py-0.5 rounded-full bg-surface dark:bg-navy text-muted text-xs font-bold">
                      {lead.veces_encontrado}
                    </span>
                  </td>
                  <td className="px-4 py-3"><EstadoBadge lead={lead} /></td>
                  <td className="hidden md:table-cell px-4 py-3 text-muted text-xs">
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
