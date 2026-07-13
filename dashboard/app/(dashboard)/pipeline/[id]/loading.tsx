import { Skeleton } from '@/components/ui/skeleton'
import { FiArrowLeft } from 'react-icons/fi'

function SectionSkeleton({ rows }: { rows: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-5">
      <Skeleton className="h-4 w-36 mb-4" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3.5 w-28 shrink-0" />
            <Skeleton className="h-9 flex-1 rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Loading() {
  return (
    <main className="max-w-3xl mx-auto px-4 py-6 flex flex-col gap-5">
      <span className="inline-flex items-center gap-1.5 text-sm text-muted w-fit">
        <FiArrowLeft size={15} /> Volver al pipeline
      </span>

      <div>
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48 mt-2" />
      </div>

      <SectionSkeleton rows={2} />
      <SectionSkeleton rows={4} />
      <SectionSkeleton rows={3} />
    </main>
  )
}
