import { createClient } from '@supabase/supabase-js'
import ws from 'ws'
import { appendFileSync } from 'fs'
import 'dotenv/config'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, {
  realtime: { transport: ws },
})

async function main() {
  const now = new Date()
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  const dayAgoStr = dayAgo.toISOString()

  const [searchesRes, newLeadsRes, totalRes] = await Promise.all([
    supabase
      .from('searches')
      .select('niche, location, results_found, new_leads')
      .gte('ran_at', dayAgoStr)
      .order('new_leads', { ascending: false }),
    supabase
      .from('leads')
      .select('username, url, nichos, ubicaciones')
      .gte('first_seen_at', dayAgoStr)
      .order('first_seen_at', { ascending: false }),
    supabase.from('leads').select('id, calificado, contactado'),
  ])

  const searches = searchesRes.data || []
  const newLeads = newLeadsRes.data || []
  const allLeads = totalRes.data || []

  const totalLeads = allLeads.length
  const totalPendientes = allLeads.filter((l) => l.calificado === null).length
  const totalCalificados = allLeads.filter((l) => l.calificado === true && !l.contactado).length
  const totalContactados = allLeads.filter((l) => l.contactado).length

  const totalNewLeads = newLeads.length
  const totalSearches = searches.length
  const totalFoundProfiles = searches.reduce((sum, s) => sum + (s.results_found || 0), 0)

  const fecha = now.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })

  const reporte = `=== REPORTE DIARIO — IG LEADS ===
Fecha: ${fecha}

SCRAPING DE HOY
- Búsquedas realizadas: ${totalSearches}
- Perfiles encontrados (total): ${totalFoundProfiles}
- Perfiles NUEVOS agregados: ${totalNewLeads}

${searches.length > 0 ? `BÚSQUEDAS REALIZADAS\n${searches.map((s) => `  • "${s.niche}" + "${s.location}": ${s.new_leads} nuevos (${s.results_found} total)`).join('\n')}` : ''}

${newLeads.length > 0 ? `PERFILES NUEVOS ENCONTRADOS\n${newLeads.map((l) => `  • @${l.username} — ${l.ubicaciones || '?'}`).join('\n')}` : 'Sin perfiles nuevos hoy.'}

ESTADO ACTUAL DE LA DB
- Total leads: ${totalLeads}
- Pendientes de revisar: ${totalPendientes}
- Calificados sin contactar: ${totalCalificados}
- Contactados: ${totalContactados}
`

  console.log(reporte)

  const summaryFile = process.env.GITHUB_STEP_SUMMARY
  if (summaryFile) {
    const markdown = `# Reporte Diario — IG Leads (${fecha})\n\n\`\`\`\n${reporte}\n\`\`\``
    appendFileSync(summaryFile, markdown)
  }
}

main().catch((err) => {
  console.error('Error:', err)
  process.exit(1)
})
