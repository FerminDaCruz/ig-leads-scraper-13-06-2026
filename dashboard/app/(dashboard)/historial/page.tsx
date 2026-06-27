export const dynamic = 'force-dynamic'

import { getSupabase, Lead } from '@/lib/supabase'
import { LocationFilter } from '@/components/LocationFilter'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { Suspense } from 'react'

type Filtro = 'todos' | 'pendientes' | 'calificados' | 'descartados' | 'contactados'

const FILTROS: { id: Filtro; label: string }[] = [
  { id: 'todos',       label: 'Todos' },
  { id: 'pendientes',  label: 'Sin revisar' },
  { id: 'calificados', label: 'Calificados' },
  { id: 'descartados', label: 'Descartados' },
  { id: 'contactados', label: 'Contactados' },
]

function EstadoBadge({ lead }: { lead: Lead }) {
  if (lead.contactado)           return <Badge variant="contacted">Contactado</Badge>
  if (lead.calificado === true)  return <Badge variant="success">Calificado</Badge>
  if (lead.calificado === false) return <Badge variant="destructive">Descartado</Badge>
  return <Badge variant="pending">Pendiente</Badge>
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

  if (filtroActivo === 'pendientes')       query = query.is('calificado', null)
  else if (filtroActivo === 'calificados') query = query.eq('calificado', true).eq('contactado', false)
  else if (filtroActivo === 'descartados') query = query.eq('calificado', false)
  else if (filtroActivo === 'contactados') query = query.eq('contactado', true)

  if (ubicacion) query = query.ilike('ubicaciones', `%${ubicacion}%`)
  for (const loc of ocultar) query = query.not('ubicaciones', 'ilike', `%${loc}%`)

  const { data: leads } = await query.limit(500)
  const rows = (leads || []) as Lead[]

  return (
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
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors ${
                filtroActivo === f.id
                  ? 'bg-foreground text-background shadow-sm'
                  : 'bg-card/60 backdrop-blur-sm text-muted border border-border hover:bg-foreground/5 hover:text-foreground'
              }`}
            >
              {f.label}
            </Link>
          )
        })}
      </div>

      <Card className="overflow-x-auto">
        <Table className="min-w-[480px]">
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead className="hidden lg:table-cell">Nicho</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="hidden md:table-cell text-center">Veces</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="hidden md:table-cell">Calificado</TableHead>
              <TableHead className="hidden lg:table-cell">Contactado</TableHead>
              <TableHead className="hidden md:table-cell">Agregado</TableHead>
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
                <TableCell className="text-navy dark:text-cream/80 max-w-[160px] truncate">
                  {lead.ubicaciones || '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-center">
                  <Badge variant="count">{lead.veces_encontrado}</Badge>
                </TableCell>
                <TableCell>
                  <EstadoBadge lead={lead} />
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted text-xs">
                  {lead.qualified_at
                    ? new Date(lead.qualified_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'America/Argentina/Buenos_Aires' })
                    : '—'}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-muted text-xs">
                  {lead.contacted_at
                    ? new Date(lead.contacted_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit', timeZone:'America/Argentina/Buenos_Aires' })
                    : '—'}
                </TableCell>
                <TableCell className="hidden md:table-cell text-muted text-xs">
                  {new Date(lead.first_seen_at).toLocaleDateString('es-AR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </main>
  )
}
