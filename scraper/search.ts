import type { BrowserContext } from 'playwright'
import { randomDelay } from './browser'

const SKIP_USERNAMES = new Set([
  'p', 'reel', 'tv', 'explore', 'stories', 'accounts',
  'tags', 'locations', 'directory', 'about', 'legal', 'help',
])

function extractInstagramProfiles(text: string): { url: string; username: string }[] {
  const pattern = /instagram\.com\/([a-zA-Z0-9_.-]+)\/?/g
  const seen = new Set<string>()
  const results: { url: string; username: string }[] = []
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) !== null) {
    const username = match[1].replace(/\/$/, '')
    if (SKIP_USERNAMES.has(username)) continue
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) continue
    if (username.length < 3 || username.length > 30) continue
    if (seen.has(username)) continue
    seen.add(username)
    results.push({ username, url: `https://www.instagram.com/${username}/` })
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
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=10&hl=es`

  try {
    console.log(`  Buscando: "${niche}" + "${location}"`)

    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await randomDelay(3000, 6000)

    const isCaptcha = await page.$('[id="captcha-form"], form[action="/sorry/index"], #recaptcha')
    if (isCaptcha) {
      console.log('  ⚠️  CAPTCHA detectado, saltando esta búsqueda')
      return []
    }

    const pageContent = await page.content()
    const profiles = extractInstagramProfiles(pageContent)

    console.log(`  ✓ ${profiles.length} perfiles encontrados`)
    return profiles
  } catch (error) {
    console.error(`  ✗ Error en búsqueda: ${error}`)
    return []
  } finally {
    await page.close()
  }
}
