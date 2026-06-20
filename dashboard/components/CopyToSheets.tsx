'use client'

import { useState } from 'react'
import { FiClipboard, FiCheck } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

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
    <Button
      size="sm"
      onClick={copy}
      title="Copiar fila para Google Sheets"
      className={
        copied
          ? 'bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30'
          : 'bg-navy dark:bg-navy-dark border border-navy-border text-white/70 hover:text-white hover:bg-navy-card'
      }
    >
      {copied ? <FiCheck size={13} /> : <FiClipboard size={13} />}
      {copied ? 'Copiado' : 'Sheets'}
    </Button>
  )
}
