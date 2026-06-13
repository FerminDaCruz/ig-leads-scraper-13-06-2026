import 'dotenv/config'
import { createBrowser, randomDelay } from './browser'
import { searchGoogle } from './search'
import { getNextSearchPairs, saveSearchResults } from './db'

const SEARCHES_PER_RUN = 3

async function main() {
  console.log('🚀 Iniciando scraper de leads de Instagram')
  console.log(`   Fecha: ${new Date().toLocaleString('es-AR')}`)
  console.log(`   Búsquedas por corrida: ${SEARCHES_PER_RUN}\n`)

  const pairs = await getNextSearchPairs(SEARCHES_PER_RUN)

  if (pairs.length === 0) {
    console.log('No hay combinaciones disponibles.')
    return
  }

  console.log(`Combinaciones a buscar:`)
  pairs.forEach((p, i) => console.log(`  ${i + 1}. "${p.niche}" + "${p.location}"`))
  console.log()

  const { browser, context } = await createBrowser()

  try {
    for (let i = 0; i < pairs.length; i++) {
      const { niche, location } = pairs[i]
      const query = `site:instagram.com "${niche}" "${location}" -inurl:/p/ -inurl:/reel/ -inurl:/tv/`

      console.log(`[${i + 1}/${pairs.length}] Procesando: ${niche} | ${location}`)

      const profiles = await searchGoogle(context, niche, location)

      if (profiles.length > 0) {
        await saveSearchResults(profiles, niche, location, query)
      } else {
        // Registrar búsqueda vacía igual para no repetirla pronto
        await saveSearchResults([], niche, location, query)
      }

      if (i < pairs.length - 1) {
        const wait = Math.floor(Math.random() * 8000) + 10000
        console.log(`  Esperando ${Math.round(wait / 1000)}s antes de la próxima búsqueda...\n`)
        await randomDelay(wait, wait + 2000)
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n✅ Scraper finalizado')
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
