'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { FiSun, FiMoon } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="h-8 w-8" />

  return (
    <Button
      variant="nav"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title="Cambiar tema"
    >
      {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
    </Button>
  )
}
