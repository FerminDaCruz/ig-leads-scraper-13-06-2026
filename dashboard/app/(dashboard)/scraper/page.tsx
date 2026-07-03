export const dynamic = 'force-dynamic'

import { getSupabase, Niche, Location, Search } from '@/lib/supabase'
import { NicheManager, LocationManager } from '@/components/ScraperConfig'
import { SearchesTable } from '@/components/scraper/SearchesTable'
import { buildGroupStats, MIN_TOTAL, type GroupStat } from '@/lib/group-stats'
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { FiTag, FiMapPin, FiSearch, FiAlertCircle, FiBarChart2 } from 'react-icons/fi'

const TOP_N = 10

function StatsTable({ title, desc, head, stats }: { title: string; desc: string; head: string; stats: GroupStat[] }) {
  return (
    <Card className="overflow-x-auto">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{desc}</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{head}</TableHead>
            <TableHead className="text-center">Total</TableHead>
            <TableHead className="text-center">Calif.</TableHead>
            <TableHead className="text-center">Desc.</TableHead>
            <TableHead className="text-center">Cont.</TableHead>
            <TableHead className="text-center">% calif.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {stats.length === 0 ? (
            <TableRow><TableCell colSpan={7} className="text-center text-muted py-8">Sin datos suficientes (mín. {MIN_TOTAL} revisados)</TableCell></TableRow>
          ) : (
            stats.map((s, i) => (
              <TableRow key={s.name}>
                <TableCell className="text-muted text-xs w-6">{i + 1}</TableCell>
                <TableCell className="text-navy dark:text-cream/80 max-w-[150px] truncate">{s.name}</TableCell>
                <TableCell className="text-center text-muted">{s.total}</TableCell>
                <TableCell className="text-center text-green-600 dark:text-green-400 font-medium">{s.calificados}</TableCell>
                <TableCell className="text-center text-red-500 dark:text-red-400 font-medium">{s.descartados}</TableCell>
                <TableCell className="text-center text-brand font-medium">{s.contactados}</TableCell>
                <TableCell className="text-center"><Badge>{s.rate}%</Badge></TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  )
}

export default async function ScraperPage() {
  const supabase = getSupabase()

  const [nichesRes, locationsRes, searchesRes, allLeadsRes] = await Promise.all([
    supabase.from('niches').select('*').order('name'),
    supabase.from('locations').select('*').order('name'),
    supabase.from('searches').select('*').order('ran_at', { ascending: false }).limit(500),
    supabase.from('leads').select('nichos, ubicaciones, calificado, contactado'),
  ])

  const niches = (nichesRes.data || []) as Niche[]
  const locations = (locationsRes.data || []) as Location[]
  const searches = (searchesRes.data || []) as Search[]
  const allLeads = (allLeadsRes.data || []) as { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean }[]

  // Rendimiento por nicho / ubicación (solo leads revisados).
  const nichoStats = buildGroupStats(allLeads, 'nichos')
  const ubicacionStats = buildGroupStats(allLeads, 'ubicaciones')
  const nichoBest = nichoStats.slice(0, TOP_N)
  const nichoWorst = nichoStats.slice().reverse().slice(0, TOP_N)
  const ubicBest = ubicacionStats.slice(0, TOP_N)
  const ubicWorst = ubicacionStats.slice().reverse().slice(0, TOP_N)

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
          El ícono de ojo oculta una ubicación por defecto en el Pipeline (se sigue
          scrapeando, solo no se muestra salvo que la filtres).
        </p>
        <LocationManager locations={locations} />
      </Card>

      {/* Rendimiento por nicho / ubicación */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <FiBarChart2 size={18} className="text-muted" />
          <h2 className="font-semibold text-navy dark:text-cream">Rendimiento por nicho y ubicación</h2>
        </div>
        <p className="text-xs text-muted mb-4">
          % = calificados / revisados (calificados + descartados). Los leads sin calificar no cuentan. Mín. {MIN_TOTAL} revisados.
        </p>
        <div className="grid lg:grid-cols-2 gap-4">
          <StatsTable title="Mejores nichos" desc="Mayor % de calificación" head="Nicho" stats={nichoBest} />
          <StatsTable title="Peores nichos" desc="Menor % de calificación" head="Nicho" stats={nichoWorst} />
          <StatsTable title="Mejores ubicaciones" desc="Mayor % de calificación" head="Ubicación" stats={ubicBest} />
          <StatsTable title="Peores ubicaciones" desc="Menor % de calificación" head="Ubicación" stats={ubicWorst} />
        </div>
      </div>

      {/* Búsquedas recientes */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiSearch size={18} className="text-muted" />
          <h2 className="font-semibold text-navy dark:text-cream">Búsquedas recientes</h2>
          <Badge variant="count">{searches.length}</Badge>
        </div>
        <SearchesTable searches={searches} />
      </Card>
    </main>
  )
}
