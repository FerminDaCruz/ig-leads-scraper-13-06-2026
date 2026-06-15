'use client'

import { useState } from 'react'
import { FiClipboard, FiCheck } from 'react-icons/fi'

export function CopyToSheets({ username, url }: { username: string; url: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    const day = new Date().getDate().toString()
    const row = [username, url, day, 'No', '', '', '', 'No'].join('\t')
    navigator.clipboard.writeText(row)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={copy}
      title="Copiar fila para Google Sheets"
      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg font-medium active:scale-[0.97] transition-[transform,background-color,border-color,color] duration-150 ease-out ${
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/40'
          : 'bg-navy dark:bg-navy-dark border border-navy-border text-white/70 hover:text-white hover:bg-navy-card'
      }`}
    >
      {copied ? <FiCheck size={13} /> : <FiClipboard size={13} />}
      {copied ? 'Copiado' : 'Sheets'}
    </button>
  )
}
