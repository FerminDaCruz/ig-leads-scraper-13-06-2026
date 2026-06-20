'use client'

import { useState, useTransition } from 'react'
import { marcarCalificado, marcarContactado, desCalificar } from '@/lib/actions'
import { FiCheck, FiX, FiSend, FiMoreVertical } from 'react-icons/fi'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

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

export function CalificarButtons({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return <span className="text-muted text-sm italic">Guardado</span>

  return (
    <div className="flex gap-2">
      <Button
        variant="success"
        size="sm"
        disabled={isPending}
        onClick={() => { setDone(true); startTransition(() => marcarCalificado(leadId, true)) }}
      >
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
    </div>
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
