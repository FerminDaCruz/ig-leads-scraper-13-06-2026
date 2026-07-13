import { Skeleton, SkeletonTabs, SkeletonStat, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-cream">Métricas</h1>
          <Skeleton className="h-4 w-40 mt-2" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-xl" />
          <Skeleton className="h-9 w-24 rounded-xl" />
        </div>
      </div>

      {/* Filtro por mes */}
      <SkeletonTabs count={5} className="mb-3" />
      {/* Sub-vista día / semana */}
      <SkeletonTabs count={3} className="mb-6" />

      {/* Actividad del período */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStat key={i} hint />
        ))}
      </div>

      {/* Embudo de etapas */}
      <div className="mb-4">
        <SkeletonTable rows={6} cols={5} />
      </div>

      {/* Tiempos promedio */}
      <div className="mb-4 rounded-2xl border border-border bg-card/70 backdrop-blur-md">
        <div className="px-4 py-3 border-b border-surface dark:border-navy-border">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-52 mt-2" />
        </div>
        <div className="p-4 grid grid-cols-2 gap-3">
          <SkeletonStat />
          <SkeletonStat />
        </div>
      </div>

      {/* Iniciados por día (heatmap) */}
      <div className="mb-4 rounded-2xl border border-border bg-card/70 backdrop-blur-md overflow-hidden">
        <div className="px-4 py-3 border-b border-surface dark:border-navy-border">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-72 mt-2" />
        </div>
        <div className="p-4 flex flex-col gap-2">
          {Array.from({ length: 3 }).map((_, row) => (
            <div key={row} className="flex items-center gap-1.5">
              <Skeleton className="h-4 w-16 shrink-0" />
              {Array.from({ length: 31 }).map((_, d) => (
                <Skeleton key={d} className="h-4 flex-1 min-w-[0.5rem] rounded-sm" />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Motivos de descarte */}
      <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md">
        <div className="px-4 py-3 border-b border-surface dark:border-navy-border">
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-3 w-64 mt-2" />
        </div>
        <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-14 mt-2" />
              <Skeleton className="h-1.5 w-full mt-2.5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </main>
  )
}
