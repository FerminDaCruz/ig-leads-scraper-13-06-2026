export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { Nav } from '@/components/Nav'
import { ContactarButton } from '@/components/LeadActions'
import { CopyToSheets } from '@/components/CopyToSheets'
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
            <h1 className="text-2xl font-bold text-navy dark:text-cream">Contactar</h1>
            <p className="text-[#6b7280] text-sm mt-1">
              {rows.length} leads calificados listos para contactar
            </p>
          </div>
          <Suspense>
            <LocationFilter />
          </Suspense>
        </div>

        {rows.length === 0 ? (
          <div className="text-center py-20 text-[#6b7280]">
            <p className="text-xl font-medium">
              {ubicacion ? `Sin leads en "${ubicacion}"` : 'No hay leads listos para contactar'}
            </p>
            {!ubicacion && (
              <p className="text-sm mt-2">Calificá más leads en el panel anterior</p>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-navy-card rounded-xl border border-surface dark:border-navy-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface dark:border-navy-border bg-surface dark:bg-navy">
                  <th className="text-left px-4 py-3 text-[#6b7280] font-semibold">Usuario</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-semibold">Nicho</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-semibold">Ubicación</th>
                  <th className="text-center px-4 py-3 text-[#6b7280] font-semibold">Veces</th>
                  <th className="text-left px-4 py-3 text-[#6b7280] font-semibold">Acciones</th>
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
                    <td className="px-4 py-3 text-navy dark:text-cream/80 max-w-[180px] truncate">{lead.nichos || '—'}</td>
                    <td className="px-4 py-3 text-navy dark:text-cream/80 max-w-[160px] truncate">{lead.ubicaciones || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full bg-surface dark:bg-navy text-[#6b7280] text-xs font-bold">
                        {lead.veces_encontrado}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CopyToSheets username={lead.username} url={lead.url} />
                        <ContactarButton leadId={lead.id} />
                      </div>
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
