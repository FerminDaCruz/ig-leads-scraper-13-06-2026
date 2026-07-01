'use client'

import { useState, useEffect, useTransition } from 'react'
import { createPortal } from 'react-dom'
import { marcarCalificado, marcarContactado, desCalificar, calificarLead } from '@/lib/actions'
import { FiCheck, FiX, FiSend, FiMoreVertical, FiGlobe, FiSlash } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const RAZONES_CALIFICAR = [
  { value: 'ya_tiene_web',         label: 'Ya tiene web' },
  { value: 'inactivo',             label: 'Inactivo' },
  { value: 'no_es_alojamiento',    label: 'No es alojamiento' },
  { value: 'pocos_seguidores',     label: 'Pocos seguidores' },
  { value: 'perfil_no_encontrado', label: 'Perfil no encontrado' },
  { value: 'otro',                 label: 'Otro' },
]

const RAZONES_DESCARTAR = [
  { value: 'inactivo',             label: 'Inactivo' },
  { value: 'ya_tiene_web',         label: 'Ya tiene web' },
  { value: 'pocos_seguidores',     label: 'Pocos seguidores' },
  { value: 'perfil_no_encontrado', label: 'Perfil no encontrado' },
  { value: 'otro',                 label: 'Otro' },
]

export function CalificarButtons({ leadId, username }: { leadId: number; username?: string }) {
  const [done, setDone] = useState(false)
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return <span className="text-muted text-sm italic">Guardado</span>

  const confirmar = (tieneWeb: boolean, notas: string | null) => {
    setOpen(false)
    setDone(true)
    startTransition(() => calificarLead(leadId, tieneWeb, notas))
  }

  return (
    <div className="flex gap-2">
      <Button variant="success" size="sm" disabled={isPending} onClick={() => setOpen(true)}>
        <FiCheck size={14} /> Calificado
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="danger" size="sm" disabled={isPending}>
            <FiX size={14} /> No
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start">
          <DropdownMenuLabel>Motivo</DropdownMenuLabel>
          {RAZONES_CALIFICAR.map((r) => (
            <DropdownMenuItem
              key={r.value}
              onClick={() => { setDone(true); startTransition(() => marcarCalificado(leadId, false, r.value)) }}
            >
              {r.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <CalificarModal open={open} onClose={() => setOpen(false)} onConfirm={confirmar} username={username} />
    </div>
  )
}

function CalificarModal({
  open,
  onClose,
  onConfirm,
  username,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (tieneWeb: boolean, notas: string | null) => void
  username?: string
}) {
  const [mounted, setMounted] = useState(false)
  const [tieneWeb, setTieneWeb] = useState<boolean | null>(null)
  const [notas, setNotas] = useState('')

  useEffect(() => setMounted(true), [])
  useEffect(() => {
    if (open) { setTieneWeb(null); setNotas('') }
  }, [open])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!mounted || !open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-border bg-card shadow-2xl p-6 flex flex-col gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-lg font-bold text-navy dark:text-cream">Calificar lead</h2>
          {username && <p className="text-sm text-muted mt-0.5">@{username}</p>}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-sm text-muted">¿Tiene página web?</span>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setTieneWeb(false)}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl border text-sm font-semibold transition-colors ${
                tieneWeb === false ? 'bg-foreground text-background border-transparent' : 'border-border text-foreground hover:bg-foreground/5'
              }`}
            >
              <FiSlash size={16} /> Sin web
            </button>
            <button
              type="button"
              onClick={() => setTieneWeb(true)}
              className={`flex items-center justify-center gap-2 py-4 rounded-2xl border text-sm font-semibold transition-colors ${
                tieneWeb === true ? 'bg-foreground text-background border-transparent' : 'border-border text-foreground hover:bg-foreground/5'
              }`}
            >
              <FiGlobe size={16} /> Con web
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={`text-sm ${tieneWeb === true ? 'text-muted' : 'text-muted/50'}`}>Notas</span>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={tieneWeb !== true}
            rows={4}
            placeholder={tieneWeb === true ? 'Notas sobre la web / oportunidades de mejora...' : 'Se desbloquea al elegir «Con web»'}
            className="w-full px-3 py-2 text-sm rounded-xl border bg-white dark:bg-navy-card text-navy dark:text-cream border-surface dark:border-navy-border focus:outline-none focus:ring-2 focus:ring-brand placeholder:text-muted disabled:opacity-50 disabled:cursor-not-allowed resize-y"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-xl text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={tieneWeb === null}
            onClick={() => onConfirm(tieneWeb as boolean, tieneWeb ? notas.trim() || null : null)}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-foreground text-background hover:opacity-90 active:scale-[0.97] transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}

export function ContactarButton({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return <span className="text-muted text-sm italic">Contactado</span>

  return (
    <Button
      size="sm"
      disabled={isPending}
      onClick={() => { setDone(true); startTransition(() => marcarContactado(leadId)) }}
    >
      <FiSend size={13} /> Contactado
    </Button>
  )
}

export function DescartarMenu({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return <span className="text-muted text-sm italic">Descartado</span>

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isPending} title="Opciones">
          <FiMoreVertical size={16} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="end">
        <DropdownMenuLabel>Descalificar</DropdownMenuLabel>
        {RAZONES_DESCARTAR.map((r) => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => { setDone(true); startTransition(() => desCalificar(leadId, r.value)) }}
          >
            {r.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
