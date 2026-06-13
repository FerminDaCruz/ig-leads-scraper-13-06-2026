'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { marcarCalificado, marcarContactado } from '@/lib/actions'

export function CalificarButtons({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (done) return <span className="text-gray-400 text-sm italic">Guardado</span>

  const handle = (valor: boolean) => {
    setDone(true)
    startTransition(async () => {
      await marcarCalificado(leadId, valor)
      router.refresh()
    })
  }

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handle(true)}
        disabled={isPending}
        className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        ✅ Calificado
      </button>
      <button
        onClick={() => handle(false)}
        disabled={isPending}
        className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        ❌ No
      </button>
    </div>
  )
}

export function ContactarButton({ leadId }: { leadId: number }) {
  const [done, setDone] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  if (done) return <span className="text-gray-400 text-sm italic">Contactado</span>

  const handle = () => {
    setDone(true)
    startTransition(async () => {
      await marcarContactado(leadId)
      router.refresh()
    })
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded-lg font-medium disabled:opacity-50 transition-colors"
    >
      ✅ Contactado
    </button>
  )
}
