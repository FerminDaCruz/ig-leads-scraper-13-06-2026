'use client'

import { useState, useTransition } from 'react'
import { marcarCalificado, marcarContactado } from '@/lib/actions'
import { FiCheck, FiX, FiSend } from 'react-icons/fi'

export function CalificarButtons({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return <span className="text-muted text-sm italic animate-fade-in">Guardado</span>

  const handle = (valor: boolean) => {
    setDone(true)
    startTransition(async () => {
      await marcarCalificado(leadId, valor)
    })
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handle(true)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 active:scale-[0.97] text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-[transform,background-color] duration-150 ease-out"
      >
        <FiCheck size={14} />
        Calificado
      </button>
      <button
        onClick={() => handle(false)}
        disabled={isPending}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 active:scale-[0.97] text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-[transform,background-color] duration-150 ease-out"
      >
        <FiX size={14} />
        No
      </button>
    </div>
  )
}

export function ContactarButton({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()

  if (done) return <span className="text-muted text-sm italic animate-fade-in">Contactado</span>

  const handle = () => {
    setDone(true)
    startTransition(async () => {
      await marcarContactado(leadId)
    })
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-cyan-300 active:scale-[0.97] text-navy text-sm rounded-lg font-medium disabled:opacity-50 transition-[transform,background-color] duration-150 ease-out"
    >
      <FiSend size={13} />
      Contactado
    </button>
  )
}
