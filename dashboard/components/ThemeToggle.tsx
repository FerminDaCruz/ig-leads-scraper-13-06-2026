'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { FiSun, FiMoon } from 'react-icons/fi'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])
  if (!mounted) return <div className="w-8 h-8" />

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      title="Cambiar tema"
    >
      {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
    </button>
  )
}
