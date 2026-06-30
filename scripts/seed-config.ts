import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import 'dotenv/config'
import { NICHES } from '../scraper/config/niches'
import { LOCATIONS } from '../scraper/config/locations'

// Ubicaciones que arrancan ocultas por defecto en Calificar/Contactar.
const HIDDEN_BY_DEFAULT = ['Bariloche']

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  realtime: { transport: ws },
})

async function main() {
  console.log('🌱 Sembrando configuración del scraper en Supabase...\n')

  const niches = NICHES.map((name) => ({ name }))
  const locations = LOCATIONS.map((name) => ({
    name,
    hidden_by_default: HIDDEN_BY_DEFAULT.includes(name),
  }))

  const { error: nErr } = await supabase.from('niches').upsert(niches, { onConflict: 'name' })
  if (nErr) {
    console.error('✗ Error sembrando nichos:', nErr.message)
    console.error('  ¿Corriste primero el SQL de scripts/schema-config.sql en Supabase?')
    process.exit(1)
  }
  console.log(`✓ ${niches.length} nichos`)

  const { error: lErr } = await supabase.from('locations').upsert(locations, { onConflict: 'name' })
  if (lErr) {
    console.error('✗ Error sembrando ubicaciones:', lErr.message)
    process.exit(1)
  }
  console.log(`✓ ${locations.length} ubicaciones (${HIDDEN_BY_DEFAULT.length} ocultas por defecto)`)

  console.log('\n✅ Seed completo. Ya podés editar nichos y ubicaciones desde la pestaña Scraper.')
  process.exit(0)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
