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

// DuckDuckGo wraps links as /l/?uddg=ENCODED_URL — extract and decode
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
      if (uddg) targetUrl = uddg  // URLSearchParams auto-decodes %2F → /
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

export async function searchGoogle(
  context: BrowserContext,
  niche: string,
  location: string
): Promise<{ url: string; username: string }[]> {
  const page = await context.newPage()
  const query = `site:instagram.com "${niche}" "${location}" -inurl:/p/ -inurl:/reel/ -inurl:/tv/`
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&kl=ar-es`

  try {
    console.log(`  Buscando: "${niche}" + "${location}"`)

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await randomDelay(2000, 4000)

    const profiles = await extractFromPage(page)
    console.log(`  ✓ ${profiles.length} perfiles encontrados`)
    return profiles
  } catch (error) {
    console.error(`  ✗ Error en búsqueda: ${error}`)
    return []
  } finally {
    await page.close()
  }
}
