export const dynamic = 'force-dynamic'

import { getSupabase, Niche, Location, Search } from '@/lib/supabase'
import { NicheManager, LocationManager } from '@/components/ScraperConfig'
import { Card } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FiTag, FiMapPin, FiSearch, FiAlertCircle } from 'react-icons/fi'

export default async function ScraperPage() {
  const supabase = getSupabase()

  const [nichesRes, locationsRes, searchesRes] = await Promise.all([
    supabase.from('niches').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('searches').select('*').order('ran_at', { ascending: false }).limit(100),
  ])

  const niches = (nichesRes.data || []) as Niche[]
  const locations = (locationsRes.data || []) as Location[]
  const searches = (searchesRes.data || []) as Search[]

  // Las tablas de config todavía no existen (falta correr el SQL + seed).
  const sinConfig = !!nichesRes.error || !!locationsRes.error

  const totalCombinaciones = niches.length * locations.length

  return (
    <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Scraper</h1>
        <p className="text-muted text-sm mt-1">
          {sinConfig
            ? 'Configurá los nichos y ubicaciones que busca el scraper'
            : `${niches.length} nichos × ${locations.length} ubicaciones · ${totalCombinaciones} combinaciones posibles`}
        </p>
      </div>

      {sinConfig && (
        <Card className="p-5 border-amber-500/40 bg-amber-500/[0.06]">
          <div className="flex gap-3">
            <FiAlertCircle size={20} className="shrink-0 text-amber-500 mt-0.5" />
            <div className="text-sm text-navy dark:text-cream/90 space-y-2">
              <p className="font-semibold">Falta crear las tablas de configuración</p>
              <p className="text-muted">
                Pegá el contenido de <code className="text-foreground">scripts/schema-config.sql</code> en el
                SQL Editor de Supabase y ejecutalo. Después corré{' '}
                <code className="text-foreground">npm run seed:config</code> para cargar los valores actuales.
                Mientras tanto el scraper sigue usando los archivos de <code className="text-foreground">scraper/config</code>.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Nichos */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiTag size={18} className="text-muted" />
          <h2 className="font-semibold text-navy dark:text-cream">Nichos</h2>
          <Badge variant="count">{niches.length}</Badge>
        </div>
        <NicheManager niches={niches} />
      </Card>

      {/* Ubicaciones */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <FiMapPin size={18} className="text-muted" />
          <h2 className="font-semibold text-navy dark:text-cream">Ubicaciones</h2>
          <Badge variant="count">{locations.length}</Badge>
        </div>
        <p className="text-xs text-muted mb-4">
          El ícono de ojo oculta una ubicación por defecto en Calificar y Contactar (se sigue
          scrapeando, solo no se muestra salvo que la filtres).
        </p>
        <LocationManager locations={locations} />
      </Card>

      {/* Búsquedas recientes */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiSearch size={18} className="text-muted" />
          <h2 className="font-semibold text-navy dark:text-cream">Búsquedas recientes</h2>
          <Badge variant="count">{searches.length}</Badge>
        </div>

        {searches.length === 0 ? (
          <p className="text-sm text-muted">Todavía no se registraron búsquedas.</p>
        ) : (
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
                {searches.map((s) => (
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
        )}
      </Card>
    </main>
  )
}
