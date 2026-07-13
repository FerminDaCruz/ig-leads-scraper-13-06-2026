import { Skeleton, SkeletonStat } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
      <div className="mb-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Hoy</h2>
      <div className="grid grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStat key={i} />
        ))}
      </div>

      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Pendientes</h2>
      <div className="grid sm:grid-cols-3 gap-3 mb-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonStat key={i} hint />
        ))}
      </div>

      <div className="mb-8 rounded-2xl border border-border bg-card/70 backdrop-blur-md p-4 flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
        <div className="flex-1">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-6 w-20 mt-2" />
        </div>
      </div>

      <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-3">Secciones</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-4 flex flex-col gap-2">
            <Skeleton className="h-10 w-10 rounded-xl" />
            <div>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-36 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
