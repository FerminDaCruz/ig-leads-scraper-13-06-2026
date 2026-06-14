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
      className="flex items-center gap-2 px-4 py-2 bg-brand hover:bg-cyan-300 text-navy text-sm rounded-lg font-medium transition-colors"
    >
      {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
      {copied ? 'Copiado!' : 'Copiar reporte'}
    </button>
  )
}
