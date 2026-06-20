import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'bg-brand/20 text-navy dark:text-brand',
        secondary:   'bg-surface dark:bg-navy text-muted',
        success:     'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
        destructive: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
        pending:     'bg-surface dark:bg-navy text-muted',
        contacted:   'bg-brand/20 text-brand',
        count:       'bg-surface dark:bg-navy text-muted font-bold',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
