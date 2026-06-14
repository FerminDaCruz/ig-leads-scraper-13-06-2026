'use client'

import { logout } from '@/lib/auth'
import { FiLogOut } from 'react-icons/fi'

export function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        title="Cerrar sesión"
        className="p-2 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
      >
        <FiLogOut size={18} />
      </button>
    </form>
  )
}
