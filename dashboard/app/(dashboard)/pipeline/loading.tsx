import { Skeleton, SkeletonTabs } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-navy dark:text-cream">Pipeline</h1>
        <p className="text-muted text-sm mt-1">Calificá y gestioná tus leads por etapa</p>
      </div>

      {/* Buscador */}
      <Skeleton className="h-[2.4rem] w-full rounded-xl mb-4" />

      {/* Tabs de etapa */}
      <SkeletonTabs count={9} className="mb-5" />

      {/* Leads */}
      <div className="flex flex-col gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-3.5 w-32 mt-2" />
                <div className="flex gap-2 mt-3">
                  <Skeleton className="h-5 w-24 rounded-full" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Skeleton className="h-8 w-20 rounded-xl" />
                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </main>
  )
}
