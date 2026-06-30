export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { getHiddenLocations } from '@/lib/hidden'
import { CalificarButtons } from '@/components/LeadActions'
import { EditarUbicacion } from '@/components/EditarUbicacion'
import { LocationFilter } from '@/components/LocationFilter'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Suspense } from 'react'
import { FiCheckSquare } from 'react-icons/fi'

export default async function CalificarPage({
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
    .is('calificado', null)
    .order('veces_encontrado', { ascending: false })
    .limit(100)

  if (ubicacion) query = query.ilike('ubicaciones', `%${ubicacion}%`)
  // Ocultar las del filtro + las ocultas por defecto (ej. Bariloche), salvo que
  // se esté filtrando explícitamente por esa ubicación.
  const hidden = await getHiddenLocations()
  const aOcultar = [...new Set([...ocultar, ...hidden])].filter((loc) => loc !== ubicacion)
  for (const loc of aOcultar) query = query.not('ubicaciones', 'ilike', `%${loc}%`)

  const { data: leads } = await query
  const rows = (leads || []) as Lead[]

  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-cream">Calificar Leads</h1>
          <p className="text-muted text-sm mt-1">
            {rows.length} leads pendientes · Revisá el perfil y marcá si califica o no
          </p>
        </div>
        <Suspense>
          <LocationFilter />
        </Suspense>
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-24 text-muted">
          <FiCheckSquare size={36} className="mx-auto mb-4 opacity-30" />
          <p className="text-base font-semibold text-navy dark:text-cream/70">
            {ubicacion ? `Sin leads pendientes en "${ubicacion}"` : 'No hay leads pendientes'}
          </p>
          {!ubicacion && (
            <p className="text-sm mt-1">Corrí el scraper para agregar nuevos perfiles</p>
          )}
        </div>
      ) : (
        <Card className="overflow-x-auto">
          <Table className="min-w-[480px]">
            <TableHeader>
              <TableRow>
                <TableHead>Usuario</TableHead>
                <TableHead className="hidden lg:table-cell">Nicho</TableHead>
                <TableHead>Ubicación</TableHead>
                <TableHead className="text-center">Veces</TableHead>
                <TableHead>Acción</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((lead) => (
                <TableRow key={lead.id}>
                  <TableCell>
                    <a href={lead.url} target="_blank" rel="noopener noreferrer"
                      className="text-foreground font-medium underline-offset-2 hover:underline decoration-foreground/40">
                      @{lead.username}
                    </a>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-navy dark:text-cream/80 max-w-[180px] truncate">
                    {lead.nichos || '—'}
                  </TableCell>
                  <TableCell className="max-w-[160px] truncate">
                    <EditarUbicacion leadId={lead.id} ubicacion={lead.ubicaciones} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="count">{lead.veces_encontrado}</Badge>
                  </TableCell>
                  <TableCell>
                    <CalificarButtons leadId={lead.id} />
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
