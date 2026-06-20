'use client'

import Link from 'next/link'

const PERIODS = [
  { id: 'hoy',    label: 'Hoy' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes',    label: 'Este mes' },
  { id: '7d',     label: '7 días' },
  { id: '30d',    label: '30 días' },
]

export function PeriodTabs({ current }: { current: string }) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {PERIODS.map((p) => (
        <Link
          key={p.id}
          href={`/stats?period=${p.id}`}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            current === p.id
              ? 'bg-brand text-navy'
              : 'bg-white dark:bg-navy-card text-muted border border-surface dark:border-navy-border hover:bg-cream dark:hover:bg-navy'
          }`}
        >
          {p.label}
        </Link>
      ))}
    </div>
  )
}
