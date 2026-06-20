'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

const PERIODS = [
  { id: '7d',     label: '7 días' },
  { id: '30d',    label: '30 días' },
  { id: 'semana', label: 'Esta semana' },
  { id: 'mes',    label: 'Este mes' },
  { id: 'hoy',   label: 'Hoy' },
]

export function PeriodTabs({ current, currentDate }: { current: string; currentDate?: string }) {
  const router = useRouter()
  const base     = 'px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border'
  const active   = 'bg-brand text-navy border-brand'
  const inactive = 'bg-white dark:bg-navy-card text-muted border-surface dark:border-navy-border hover:bg-cream dark:hover:bg-navy'

  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      {PERIODS.map((p) => (
        <Link key={p.id} href={`/stats?period=${p.id}`}
          className={`${base} ${current === p.id ? active : inactive}`}>
          {p.label}
        </Link>
      ))}

      <input
        key={currentDate ?? 'empty'}
        type="date"
        defaultValue={current === 'dia' ? (currentDate ?? '') : ''}
        onChange={(e) => {
          if (e.target.value) router.push(`/stats?period=dia&date=${e.target.value}`)
        }}
        className={`${base} cursor-pointer [color-scheme:light] dark:[color-scheme:dark] ${
          current === 'dia' ? active : inactive
        }`}
      />
    </div>
  )
}
