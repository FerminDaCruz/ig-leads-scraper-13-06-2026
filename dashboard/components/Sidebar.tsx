import { getSupabase } from '@/lib/supabase'
import { SidebarClient } from './SidebarClient'

export async function Sidebar() {
  const supabase = getSupabase()

  // Leads sin calificar (badge del Pipeline).
  const { count } = await supabase
    .from('leads')
    .select('id', { count: 'exact', head: true })
    .is('calificado', null)

  return <SidebarClient pendientes={count ?? 0} />
}
