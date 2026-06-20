import type { BrowserContext, Page } from 'playwright'
import { randomDelay } from './browser'

const SKIP_USERNAMES = new Set([
  'p', 'reel', 'tv', 'explore', 'stories', 'accounts',
  'tags', 'locations', 'directory', 'about', 'legal', 'help',
])

function parseInstagramUrl(rawUrl: string): { url: string; username: string } | null {
  const match = rawUrl.match(/instagram\.com\/([a-zA-Z0-9_.-]+)\/?/)
  if (!match) return null
  const username = match[1]
  if (SKIP_USERNAMES.has(username)) return null
  if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return null
  if (username.length < 3 || username.length > 30) return null
  return { username, url: `https://www.instagram.com/${username}/` }
}

async function extractFromPage(page: Page): Promise<{ url: string; username: string }[]> {
  const hrefs: string[] = await page.$$eval('a[href]', (links) =>
    links.map((l) => (l as HTMLAnchorElement).href)
  )

  const seen = new Set<string>()
  const results: { url: string; username: string }[] = []

  for (const href of hrefs) {
    let targetUrl = href
    try {
      const parsed = new URL(href)
      const uddg = parsed.searchParams.get('uddg')
      if (uddg) targetUrl = uddg
    } catch {
      continue
    }

    const profile = parseInstagramUrl(targetUrl)
    if (!profile || seen.has(profile.username)) continue
    seen.add(profile.username)
    results.push(profile)
  }

  return results
}

export async function searchDDG(
  context: BrowserContext,
  niche: string,
  location: string,
  maxPages = 3
): Promise<{ url: string; username: string }[]> {
  const page = await context.newPage()
  const query = `site:instagram.com "${niche}" "${location}" -inurl:/p/ -inurl:/reel/ -inurl:/tv/`
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=ar-es`

  const allProfiles: { url: string; username: string }[] = []
  const seenAll = new Set<string>()
  let pagesVisited = 0

  try {
    console.log(`  Buscando: "${niche}" + "${location}"`)
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await randomDelay(2000, 4000)

    for (let pg = 1; pg <= maxPages; pg++) {
      pagesVisited = pg

      const profiles = await extractFromPage(page)
      let newOnPage = 0
      for (const p of profiles) {
        if (!seenAll.has(p.username)) {
          seenAll.add(p.username)
          allProfiles.push(p)
          newOnPage++
        }
      }

      console.log(`  Página ${pg}: ${newOnPage} perfiles únicos`)

      if (pg >= maxPages) break

      // Si la página no devolvió nada, no tiene sentido seguir paginando
      if (newOnPage === 0) break

      // DuckDuckGo HTML renderiza la siguiente página a través de un formulario
      // con clase .nav-link al final. El último botón submit es "Siguiente / More".
      const navButtons = await page.$$('.nav-link input[type="submit"]')
      if (navButtons.length === 0) {
        console.log(`  Sin más páginas disponibles`)
        break
      }

      await navButtons[navButtons.length - 1].click()
      await page.waitForLoadState('domcontentloaded')
      await randomDelay(2000, 4000)
    }

    console.log(`  ✓ Total: ${allProfiles.length} perfiles en ${pagesVisited} página(s)`)
    return allProfiles
  } catch (error) {
    console.error(`  ✗ Error: ${error}`)
    return allProfiles
  } finally {
    await page.close()
  }
}
