'use client'

import { useState } from 'react'
import { FiCopy, FiCheck } from 'react-icons/fi'

export function CopyReport({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-cyan-300 active:scale-[0.97] text-navy text-sm rounded-lg font-medium transition-[transform,background-color] duration-150 ease-out"
    >
      <span className="transition-[opacity] duration-150 ease-out">
        {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
      </span>
      {copied ? 'Copiado!' : 'Copiar reporte'}
    </button>
  )
}
