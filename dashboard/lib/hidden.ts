import { getSupabase } from './supabase'
import { HIDDEN_BY_DEFAULT } from './constants'

// Ubicaciones que se ocultan por defecto en Calificar y Contactar.
// Lee la tabla `locations` (toggle editable desde la pestaña Scraper).
// Si la tabla todavía no existe (pre-migración), cae a la constante estática.
export async function getHiddenLocations(): Promise<string[]> {
  try {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('locations')
      .select('name')
      .eq('hidden_by_default', true)
    if (error || !data) return HIDDEN_BY_DEFAULT
    return data.map((r) => r.name as string)
  } catch {
    return HIDDEN_BY_DEFAULT
  }
}
