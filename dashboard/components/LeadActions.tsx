'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { marcarCalificado, marcarContactado, desCalificar } from '@/lib/actions'
import { FiCheck, FiX, FiSend, FiMoreVertical } from 'react-icons/fi'

const RAZONES_CALIFICAR = [
  { value: 'ya_tiene_web',      label: 'Ya tiene web' },
  { value: 'inactivo',          label: 'Inactivo' },
  { value: 'no_es_alojamiento', label: 'No es alojamiento' },
  { value: 'otro',              label: 'Otro' },
]

const RAZONES_DESCARTAR = [
  { value: 'inactivo',     label: 'Inactivo' },
  { value: 'ya_tiene_web', label: 'Ya tiene web' },
  { value: 'otro',         label: 'Otro' },
]

// Renders in document.body via portal to escape table overflow:hidden clipping
function FloatingMenu({
  options,
  title,
  onSelect,
  triggerRef,
  onClose,
}: {
  options: { value: string; label: string }[]
  title?: string
  onSelect: (value: string) => void
  triggerRef: React.RefObject<HTMLElement | null>
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const [coords, setCoords] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      setCoords({ top: rect.top - 8, left: rect.left })
    }

    const handler = (e: MouseEvent) => {
      if (
        !menuRef.current?.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) onClose()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return createPortal(
    <div
      ref={menuRef}
      style={{ position: 'fixed', top: coords.top, left: coords.left, transform: 'translateY(-100%)', zIndex: 9999 }}
      className="bg-white dark:bg-navy-card border border-surface dark:border-navy-border rounded-xl shadow-xl py-1.5 min-w-[170px]"
    >
      {title && (
        <p className="px-4 pt-1 pb-2 text-xs text-[#6b7280] font-semibold uppercase tracking-wider border-b border-surface dark:border-navy-border">
          {title}
        </p>
      )}
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => { onSelect(opt.value); onClose() }}
          className="w-full text-left px-4 py-2 text-sm text-navy dark:text-cream hover:bg-cream dark:hover:bg-navy transition-colors"
        >
          {opt.label}
        </button>
      ))}
    </div>,
    document.body
  )
}

// ─── Calificar ────────────────────────────────────────────────────────────────

export function CalificarButtons({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const noRef = useRef<HTMLButtonElement>(null)

  if (done) return <span className="text-[#6b7280] text-sm italic">Guardado</span>

  const handleCalificado = () => {
    setDone(true)
    startTransition(() => marcarCalificado(leadId, true))
  }

  const handleRazon = (razon: string) => {
    setDone(true)
    startTransition(() => marcarCalificado(leadId, false, razon))
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={handleCalificado}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        <FiCheck size={14} /> Calificado
      </button>
      <button
        ref={noRef}
        onClick={() => setMenuOpen(true)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        <FiX size={14} /> No
      </button>
      {menuOpen && (
        <FloatingMenu
          options={RAZONES_CALIFICAR}
          title="Motivo"
          onSelect={handleRazon}
          triggerRef={noRef}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </div>
  )
}

// ─── Contactar ────────────────────────────────────────────────────────────────

export function ContactarButton({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return <span className="text-[#6b7280] text-sm italic">Contactado</span>

  return (
    <button
      onClick={() => { setDone(true); startTransition(() => marcarContactado(leadId)) }}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-cyan-300 text-navy text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
    >
      <FiSend size={13} /> Contactado
    </button>
  )
}

export function DescartarMenu({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const btnRef = useRef<HTMLButtonElement>(null)

  if (done) return <span className="text-[#6b7280] text-sm italic">Descartado</span>

  const handleRazon = (razon: string) => {
    setDone(true)
    startTransition(() => desCalificar(leadId, razon))
  }

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setMenuOpen(true)}
        disabled={isPending}
        title="Opciones"
        className="p-1.5 rounded-lg text-[#6b7280] hover:text-navy dark:hover:text-cream hover:bg-surface dark:hover:bg-navy transition-colors"
      >
        <FiMoreVertical size={16} />
      </button>
      {menuOpen && (
        <FloatingMenu
          options={RAZONES_DESCARTAR}
          title="Descalificar"
          onSelect={handleRazon}
          triggerRef={btnRef}
          onClose={() => setMenuOpen(false)}
        />
      )}
    </>
  )
}
