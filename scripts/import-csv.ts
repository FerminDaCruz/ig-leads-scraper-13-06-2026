import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!)

interface LeadRow {
  username: string
  url: string
  nichos: string
  ubicaciones: string
  veces_encontrado: number
  calificado: boolean | null
}

function normalizeCalificado(value: string): boolean | null {
  const v = (value || '').toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '').trim()
  if (v === 'si' || v === 'yes') return true
  if (v === 'no') return false
  return null
}

function parseCsv(filepath: string): Map<string, LeadRow> {
  const content = readFileSync(filepath, 'utf-8')
  const rows = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as Record<string, string>[]

  const map = new Map<string, LeadRow>()

  for (const row of rows) {
    const username = (row['Username'] || '').trim()
    const url = (row['URL'] || '').trim()
    if (!username || !url || !url.includes('instagram.com')) continue

    const calificadoRaw = row['calificado?'] || row['Calificado'] || ''
    const calificado = normalizeCalificado(calificadoRaw)
    const veces = parseInt(row['Veces Encontrado'] || '1', 10) || 1
    const nichos = (row['Nichos'] || '').trim()
    const ubicaciones = (row['Ubicaciones'] || '').trim()

    if (map.has(username)) {
      const existing = map.get(username)!
      const mergedNichos = [
        ...new Set([
          ...existing.nichos.split(', ').filter(Boolean),
          ...nichos.split(', ').filter(Boolean),
        ]),
      ].join(', ')
      const mergedUbicaciones = [
        ...new Set([
          ...existing.ubicaciones.split(', ').filter(Boolean),
          ...ubicaciones.split(', ').filter(Boolean),
        ]),
      ].join(', ')
      let mergedCalificado = existing.calificado
      if (calificado === true) mergedCalificado = true
      else if (calificado === false && mergedCalificado !== true) mergedCalificado = false

      map.set(username, {
        ...existing,
        nichos: mergedNichos,
        ubicaciones: mergedUbicaciones,
        calificado: mergedCalificado,
        veces_encontrado: Math.max(existing.veces_encontrado, veces),
      })
    } else {
      map.set(username, { username, url, nichos, ubicaciones, calificado, veces_encontrado: veces })
    }
  }

  return map
}

function mergeMaps(a: Map<string, LeadRow>, b: Map<string, LeadRow>): Map<string, LeadRow> {
  const result = new Map(a)
  for (const [username, lead] of b) {
    if (result.has(username)) {
      const existing = result.get(username)!
      const mergedNichos = [
        ...new Set([
          ...existing.nichos.split(', ').filter(Boolean),
          ...lead.nichos.split(', ').filter(Boolean),
        ]),
      ].join(', ')
      const mergedUbicaciones = [
        ...new Set([
          ...existing.ubicaciones.split(', ').filter(Boolean),
          ...lead.ubicaciones.split(', ').filter(Boolean),
        ]),
      ].join(', ')
      let mergedCalificado = existing.calificado
      if (lead.calificado === true) mergedCalificado = true
      else if (lead.calificado === false && mergedCalificado !== true) mergedCalificado = false

      result.set(username, {
        ...existing,
        nichos: mergedNichos,
        ubicaciones: mergedUbicaciones,
        calificado: mergedCalificado,
        veces_encontrado: Math.max(existing.veces_encontrado, lead.veces_encontrado),
      })
    } else {
      result.set(username, lead)
    }
  }
  return result
}

async function main() {
  console.log('📂 Leyendo archivos CSV...')

  const file1 = parseCsv('./Leads Instagram - Alojamientos Argentina - Leads.csv')
  const file2 = parseCsv(
    './Leads Instagram - Alojamientos Argentina - Leads Instagram - Alojamientos Argentina.csv'
  )

  console.log(`  Archivo 1: ${file1.size} leads únicos`)
  console.log(`  Archivo 2: ${file2.size} leads únicos`)

  const merged = mergeMaps(file1, file2)
  const allLeads = Array.from(merged.values())

  console.log(`\n✓ Total tras merge: ${allLeads.length} leads únicos`)
  console.log(`  Calificados (sí):  ${allLeads.filter((l) => l.calificado === true).length}`)
  console.log(`  No calificados:    ${allLeads.filter((l) => l.calificado === false).length}`)
  console.log(`  Sin revisar:       ${allLeads.filter((l) => l.calificado === null).length}`)

  console.log('\n⬆️  Subiendo a Supabase...')

  const CHUNK = 100
  let done = 0
  let errors = 0

  for (let i = 0; i < allLeads.length; i += CHUNK) {
    const chunk = allLeads.slice(i, i + CHUNK)
    const { error } = await supabase
      .from('leads')
      .upsert(chunk, { onConflict: 'username' })

    if (error) {
      console.error(`\n  Error en chunk ${Math.floor(i / CHUNK) + 1}:`, error.message)
      errors += chunk.length
    } else {
      done += chunk.length
    }

    process.stdout.write(`\r  Progreso: ${Math.min(i + CHUNK, allLeads.length)}/${allLeads.length}`)
  }

  console.log(`\n\n✅ Listo!`)
  console.log(`  Subidos: ${done}`)
  if (errors > 0) console.log(`  Errores: ${errors}`)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
