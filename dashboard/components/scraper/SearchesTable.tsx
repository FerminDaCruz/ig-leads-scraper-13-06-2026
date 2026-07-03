'use client'

import { useState } from 'react'
import { Search } from '@/lib/supabase'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FiChevronDown } from 'react-icons/fi'

const PAGE = 15

export function SearchesTable({ searches }: { searches: Search[] }) {
  const [visibles, setVisibles] = useState(PAGE)
  const mostradas = searches.slice(0, visibles)
  const quedan = searches.length - mostradas.length

  if (searches.length === 0) {
    return <p className="text-sm text-muted">Todavía no se registraron búsquedas.</p>
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="overflow-x-auto -mx-5 px-5">
        <Table className="min-w-[520px]">
          <TableHeader>
            <TableRow>
              <TableHead>Nicho</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead className="text-center">Resultados</TableHead>
              <TableHead className="text-center">Nuevos</TableHead>
              <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mostradas.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="text-navy dark:text-cream/80 max-w-[160px] truncate">{s.niche}</TableCell>
                <TableCell className="text-navy dark:text-cream/80 max-w-[140px] truncate">{s.location}</TableCell>
                <TableCell className="text-center tnum text-navy dark:text-cream/80">{s.results_found}</TableCell>
                <TableCell className="text-center">
                  {s.new_leads > 0 ? (
                    <Badge variant="success">+{s.new_leads}</Badge>
                  ) : (
                    <span className="text-muted tnum">0</span>
                  )}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted text-xs tnum">
                  {new Date(s.ran_at).toLocaleString('es-AR', {
                    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    timeZone: 'America/Argentina/Buenos_Aires',
                  })}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {quedan > 0 && (
        <button
          onClick={() => setVisibles((v) => v + PAGE)}
          className="self-center inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-border text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
        >
          <FiChevronDown size={15} /> Ver más ({quedan})
        </button>
      )}
      <p className="text-xs text-muted text-center">
        Mostrando {mostradas.length} de {searches.length}
      </p>
    </div>
  )
}
