import { cn } from '@/lib/utils'

/**
 * Bloque de carga. El brillo lo hace un ::after que barre de izquierda a derecha;
 * con `prefers-reduced-motion` queda el bloque quieto.
 */
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        'relative overflow-hidden rounded-lg bg-foreground/[0.07] dark:bg-foreground/[0.09]',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-foreground/[0.09] after:to-transparent',
        'dark:after:via-foreground/[0.12] motion-reduce:after:animate-none',
        className
      )}
      {...props}
    />
  )
}

/** Título de página: h1 + bajada. */
function SkeletonHeader({ title, className }: { title?: string; className?: string }) {
  return (
    <div className={cn('mb-6', className)}>
      {title ? (
        <h1 className="text-2xl font-bold text-navy dark:text-cream">{title}</h1>
      ) : (
        <Skeleton className="h-8 w-56" />
      )}
      <Skeleton className="h-4 w-40 mt-2" />
    </div>
  )
}

/** Fila de chips/tabs de filtro. */
function SkeletonTabs({ count = 4, className }: { count?: number; className?: string }) {
  const widths = ['w-20', 'w-24', 'w-16', 'w-28', 'w-20', 'w-24', 'w-16']
  return (
    <div className={cn('flex gap-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className={cn('h-8 shrink-0 rounded-xl', widths[i % widths.length])} />
      ))}
    </div>
  )
}

/** Card de métrica: etiqueta chica, número grande y (opcional) pista al pie. */
function SkeletonStat({ hint = false }: { hint?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md p-4">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-16 mt-2.5" />
      {hint && <Skeleton className="h-3 w-28 mt-2.5" />}
    </div>
  )
}

/** Tabla dentro de una card, con encabezado y N filas. */
function SkeletonTable({
  rows = 6,
  cols = 5,
  title = true,
}: {
  rows?: number
  cols?: number
  title?: boolean
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/70 backdrop-blur-md overflow-hidden">
      {title && (
        <div className="px-4 py-3 border-b border-surface dark:border-navy-border">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-56 mt-2" />
        </div>
      )}
      <div className="p-4 flex flex-col gap-3">
        <div className="flex gap-3">
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex gap-3 items-center">
            {Array.from({ length: cols }).map((_, c) => (
              <Skeleton key={c} className={cn('h-4 flex-1', c === 0 && 'max-w-[9rem]')} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export { Skeleton, SkeletonHeader, SkeletonTabs, SkeletonStat, SkeletonTable }
