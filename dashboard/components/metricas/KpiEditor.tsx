'use client'

import { useState, useTransition } from 'react'
import { guardarKpis } from '@/lib/kpis'
import { KPI_META } from '@/lib/pipeline-stages'
import { FiSave, FiCheck, FiAlertTriangle } from 'react-icons/fi'

export function KpiEditor({ mes, valores }: { mes: string; valores: Record<string, number> }) {
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(KPI_META.map((k) => [k.etapa, String(valores[k.etapa] ?? '')]))
  )
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dirty = KPI_META.some((k) => Number(vals[k.etapa]) !== Number(valores[k.etapa]))

  const save = () => {
    const num: Record<string, number> = {}
    for (const k of KPI_META) num[k.etapa] = Number(vals[k.etapa])
    setSaved(false)
    setError(null)
    startTransition(async () => {
      const res = await guardarKpis(mes, num)
      if (res.ok) {
        setSaved(true)
        setTimeout(() => setSaved(false), 2500)
      } else {
        setError(res.error || 'No se pudo guardar')
      }
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {KPI_META.map((k) => (
          <label key={k.etapa} className="flex flex-col gap-1.5">
            <span className="text-xs text-muted">
              {k.label} <span className="opacity-70">{k.tipo === 'num' ? '(total)' : '(%)'}</span>
            </span>
            <div className="relative">
              <input
                type="number"
                min={0}
                inputMode="numeric"
                value={vals[k.etapa]}
                onChange={(e) => setVals((v) => ({ ...v, [k.etapa]: e.target.value }))}
                className="w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand tnum"
              />
              {k.tipo === 'pct' && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted pointer-events-none">%</span>
              )}
            </div>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={isPending || !dirty}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {saved ? <FiCheck size={15} /> : <FiSave size={15} />}
          {saved ? 'Guardado' : 'Guardar metas'}
        </button>
        {dirty && !saved && !error && <span className="text-xs text-muted">Cambios sin guardar</span>}
      </div>
      {error && (
        <p className="inline-flex items-start gap-1.5 text-xs text-red-500 dark:text-red-400">
          <FiAlertTriangle size={13} className="mt-0.5 shrink-0" />
          <span>No se guardó: {error}. ¿Corriste <code className="font-mono">scripts/schema-kpis.sql</code> en Supabase?</span>
        </p>
      )}
    </div>
  )
}
