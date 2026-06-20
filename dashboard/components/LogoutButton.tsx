'use client'

import { logout } from '@/lib/auth'
import { FiLogOut } from 'react-icons/fi'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  return (
    <form action={logout}>
      <Button variant="nav" size="icon" type="submit" title="Cerrar sesión">
        <FiLogOut size={18} />
      </Button>
    </form>
  )
}
