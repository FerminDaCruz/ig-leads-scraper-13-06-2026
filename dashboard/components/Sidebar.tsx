import { getSupabase } from '@/lib/supabase'
import { SidebarClient } from './SidebarClient'

export async function Sidebar() {
  const supabase = getSupabase()

  const [pendientesRes, contactarRes] = await Promise.all([
    supabase.from('leads').select('id', { count: 'exact', head: true }).is('calificado', null),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('calificado', true)
      .eq('contactado', false),
  ])

  return (
    <SidebarClient
      pendientes={pendientesRes.count ?? 0}
      listos={contactarRes.count ?? 0}
    />
  )
}
