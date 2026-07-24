import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'fs'
import { join } from 'path'

// Vuelca las tablas del CRM a un JSON con fecha en data/backups/.
// Solo lee: correlo antes de cualquier migración. Para restaurar, los valores
// originales están en el JSON (fila por fila, con su id).
const TABLAS = ['leads', 'lead_owners', 'lead_followups'] as const
const PAGE = 1000

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  realtime: { transport: ws },
  auth: { persistSession: false },
})

async function traerTodo(tabla: string) {
  const filas: unknown[] = []
  for (let desde = 0; ; desde += PAGE) {
    const { data, error } = await supabase
      .from(tabla)
      .select('*')
      .order('id')
      .range(desde, desde + PAGE - 1)
    if (error) throw new Error(`${tabla}: ${error.message}`)
    filas.push(...(data || []))
    if (!data || data.length < PAGE) return filas
  }
}

async function main() {
  const sello = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const dir = join(process.cwd(), 'data', 'backups')
  mkdirSync(dir, { recursive: true })

  const dump: Record<string, unknown[]> = {}
  for (const tabla of TABLAS) {
    const filas = await traerTodo(tabla)
    dump[tabla] = filas
    console.log(`  ${tabla}: ${filas.length} filas`)
  }

  const archivo = join(dir, `backup-${sello}.json`)
  writeFileSync(archivo, JSON.stringify({ fecha: new Date().toISOString(), tablas: dump }, null, 2))
  console.log(`\n✓ Backup en ${archivo}`)
}

main().catch((e) => {
  console.error('✗ Backup fallido:', e.message)
  process.exit(1)
})
