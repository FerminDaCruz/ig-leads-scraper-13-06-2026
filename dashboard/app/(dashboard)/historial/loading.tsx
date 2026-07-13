import { Skeleton, SkeletonTabs, SkeletonTable } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <main className="max-w-7xl mx-auto px-4 py-6">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-navy dark:text-cream">Historial</h1>
          <Skeleton className="h-4 w-20 mt-2" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-[2.4rem] w-52 rounded-lg" />
          <Skeleton className="h-[2.4rem] w-44 rounded-lg" />
        </div>
      </div>

      <SkeletonTabs count={4} className="mb-4 flex-wrap" />

      <SkeletonTable rows={10} cols={6} title={false} />
    </main>
  )
}
