export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { ContactarButton, DescartarMenu } from '@/components/LeadActions'
import { CopyToSheets } from '@/components/CopyToSheets'
import { LocationFilter } from '@/components/LocationFilter'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'
import { FiSend } from 'react-icons/fi'

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
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-cream">Contactar</h1>
          <p className="text-muted text-sm mt-1">
            {rows.length} leads calificados listos para contactar
          </p>
        </div>
        <Suspense>
          <LocationFilter />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <FiSend size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold text-navy dark:text-cream/70">
            {ubicacion ? `Sin leads en "${ubicacion}"` : 'No hay leads listos para contactar'}
          </p>
          {!ubicacion && (
            <p className="text-sm mt-1">Calificá más leads en el panel anterior</p>
          )}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[520px]">
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="hidden lg:table-cell">Nicho</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="hidden md:table-cell text-center">Veces</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <a href={lead.url} target="_blank" rel="noopener noreferrer"
                      className="text-brand hover:text-cyan-300 font-medium hover:underline">
                      @{lead.username}
                    </a>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-navy dark:text-cream/80 max-w-[180px] truncate">
                    {lead.nichos || '—'}
                  </TableCell>
                  <TableCell className="text-navy dark:text-cream/80 max-w-[160px] truncate">
                    {lead.ubicaciones || '—'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-center">
                    <Badge variant="count">{lead.veces_encontrado}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <CopyToSheets username={lead.username} url={lead.url} />
                      <ContactarButton leadId={lead.id} />
                      <DescartarMenu leadId={lead.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </main>
  )
}
