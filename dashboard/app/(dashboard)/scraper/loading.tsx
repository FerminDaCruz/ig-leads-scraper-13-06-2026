import { Skeleton, SkeletonTable } from '@/components/ui/skeleton'
import { FiTag, FiMapPin, FiBarChart2, FiSearch } from 'react-icons/fi'

/** Card con encabezado real (ícono + título) y contenido en carga. */
function ManagerSkeleton({
  icon: Icon,
  title,
  chips,
}: {
  icon: typeof FiTag
  title: string
  chips: number
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
      <div className="flex items-center gap-2 mb-4">
        <Icon size={18} className="text-muted" />
        <h2 className="font-semibold text-navy dark:text-cream">{title}</h2>
        <Skeleton className="h-5 w-8 rounded-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: chips }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-28 rounded-xl" />
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Scraper</h1>
        <Skeleton className="h-4 w-72 mt-2" />
      </div>

      <ManagerSkeleton icon={FiTag} title="Nichos" chips={8} />
      <ManagerSkeleton icon={FiMapPin} title="Ubicaciones" chips={6} />

      <div>
        <div className="flex items-center gap-2 mb-3">
          <FiBarChart2 size={18} className="text-muted" />
          <h2 className="font-semibold text-navy dark:text-cream">Rendimiento por nicho y ubicación</h2>
        </div>
        <Skeleton className="h-3 w-96 max-w-full mb-4" />
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonTable key={i} rows={5} cols={4} />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
        <div className="flex items-center gap-2 mb-4">
          <FiSearch size={18} className="text-muted" />
          <h2 className="font-semibold text-navy dark:text-cream">Búsquedas recientes</h2>
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex gap-3 items-center">
              <Skeleton className="h-4 flex-1 max-w-[10rem]" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
