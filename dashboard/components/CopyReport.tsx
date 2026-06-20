'use client'

import { useState } from 'react'
import { FiCopy, FiCheck } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

export function CopyReport({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)

  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Button onClick={copy}>
      {copied ? <FiCheck size={15} /> : <FiCopy size={15} />}
      {copied ? 'Copiado!' : 'Copiar reporte'}
    </Button>
  )
}
