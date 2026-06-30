import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import 'dotenv/config'

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
    realtime: { transport: ws },
  })
}

// Lee los nichos desde la tabla `niches`; si la tabla no existe o está vacía,
// cae al archivo de config para no romper el scraper antes de migrar.
async function fetchNiches(supabase: ReturnType<typeof getSupabase>): Promise<string[]> {
  const { data, error } = await supabase.from('niches').select('name')
  if (error || !data || data.length === 0) {
    const { NICHES } = await import('./config/niches')
    return NICHES
  }
  return data.map((r) => r.name as string)
}

async function fetchLocations(supabase: ReturnType<typeof getSupabase>): Promise<string[]> {
  const { data, error } = await supabase.from('locations').select('name')
  if (error || !data || data.length === 0) {
    const { LOCATIONS } = await import('./config/locations')
    return LOCATIONS
  }
  return data.map((r) => r.name as string)
}

export async function getNextSearchPairs(limit: number = 3) {
  const supabase = getSupabase()

  const [niches, locations] = await Promise.all([
    fetchNiches(supabase),
    fetchLocations(supabase),
  ])

  const allPairs = niches.flatMap((niche) =>
    locations.map((location) => ({ niche, location }))
  )

  const { data: searches } = await supabase
    .from('searches')
    .select('niche, location, ran_at')

  const searchedMap = new Map<string, string>(
    (searches || []).map((s) => [`${s.niche}|${s.location}`, s.ran_at])
  )

  const sorted = [...allPairs].sort((a, b) => {
    const keyA = `${a.niche}|${a.location}`
    const keyB = `${b.niche}|${b.location}`
    const ranA = searchedMap.get(keyA)
    const ranB = searchedMap.get(keyB)
    if (!ranA && !ranB) return 0
    if (!ranA) return -1
    if (!ranB) return 1
    return new Date(ranA).getTime() - new Date(ranB).getTime()
  })

  return sorted.slice(0, limit)
}

export async function saveSearchResults(
  profiles: { url: string; username: string }[],
  niche: string,
  location: string,
  query: string
) {
  const supabase = getSupabase()

  const { data: searchRecord, error: searchError } = await supabase
    .from('searches')
    .insert({ query, niche, location, results_found: profiles.length, new_leads: 0 })
    .select()
    .single()

  if (searchError || !searchRecord) {
    console.error('Error guardando búsqueda:', searchError?.message)
    return
  }

  let newLeads = 0

  for (const profile of profiles) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id, veces_encontrado, nichos, ubicaciones')
      .eq('username', profile.username)
      .single()

    let leadId: number

    if (existing) {
      const existingNichos = (existing.nichos || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      const existingUbics = (existing.ubicaciones || '').split(',').map((s: string) => s.trim()).filter(Boolean)
      const updatedNichos = existingNichos.includes(niche) ? existing.nichos : [...existingNichos, niche].join(', ')
      const updatedUbics = existingUbics.includes(location) ? existing.ubicaciones : [...existingUbics, location].join(', ')

      await supabase
        .from('leads')
        .update({
          last_seen_at: new Date().toISOString(),
          veces_encontrado: existing.veces_encontrado + 1,
          nichos: updatedNichos,
          ubicaciones: updatedUbics,
        })
        .eq('id', existing.id)
      leadId = existing.id
    } else {
      const { data: newLead, error: insertError } = await supabase
        .from('leads')
        .insert({
          username: profile.username,
          url: profile.url,
          nichos: niche,
          ubicaciones: location,
          found_via_niche: niche,
          found_via_location: location,
        })
        .select()
        .single()

      if (insertError || !newLead) continue
      leadId = newLead.id
      newLeads++
    }

    await supabase
      .from('lead_searches')
      .upsert({ lead_id: leadId, search_id: searchRecord.id })
  }

  await supabase
    .from('searches')
    .update({ new_leads: newLeads })
    .eq('id', searchRecord.id)

  console.log(`  → ${newLeads} leads nuevos, ${profiles.length - newLeads} ya existían`)
  return newLeads
}
