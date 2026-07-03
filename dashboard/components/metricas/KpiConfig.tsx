'use client'

import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { KpiEditor } from './KpiEditor'
import { FiSettings, FiX } from 'react-icons/fi'

// Botón de configuración (engranaje) que abre un modal para editar los KPIs
// del mes. Solo se usa en la vista mensual; los KPIs son siempre mensuales.
export function KpiConfig({ mes, mesLabel, valores }: { mes: string; mesLabel: string; valores: Record<string, number> }) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Configurar metas (KPI) del mes"
        aria-label="Configurar KPIs"
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-xl border border-border text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
      >
        <FiSettings size={15} /> KPIs
      </button>

      {mounted && open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-3xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-navy dark:text-cream">Metas del mes (KPI)</h2>
                <p className="text-sm text-muted mt-0.5 capitalize">{mesLabel}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="grid place-items-center h-8 w-8 rounded-lg text-muted hover:text-foreground hover:bg-foreground/5 transition-colors shrink-0"
              >
                <FiX size={16} />
              </button>
            </div>
            <p className="text-sm text-muted -mt-2">
              Iniciados es un número total; el resto es el % objetivo sobre los iniciados del mes.
            </p>
            <KpiEditor mes={mes} valores={valores} />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
