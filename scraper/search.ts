import { randomDelay } from './util'

// Error que corta el run entero: cuota agotada o IP/He key limitada por Google.
// Se propaga hasta el catch de index.ts para que el step de GitHub falle en ROJO
// (antes DDG devolvía un CAPTCHA y el scraper lo registraba como "0" en silencio).
export class SearchBlockedError extends Error {}

const SKIP_USERNAMES = new Set([
  'p', 'reel', 'reels', 'tv', 'explore', 'stories', 'accounts',
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

const ENDPOINT = 'https://www.googleapis.com/customsearch/v1'

// Busca perfiles de Instagram con la API de Google Programmable Search (JSON).
// Devuelve la misma forma que la versión vieja: { url, username }[].
// maxResults se redondea a múltiplos de 10 (Google devuelve 10 por llamada).
export async function searchGoogle(
  niche: string,
  location: string,
  maxResults = 20
): Promise<{ url: string; username: string }[]> {
  const key = process.env.GOOGLE_API_KEY
  const cx = process.env.GOOGLE_CSE_ID
  if (!key || !cx) {
    throw new SearchBlockedError(
      'Faltan GOOGLE_API_KEY / GOOGLE_CSE_ID en el entorno (revisá .env o los secrets de GitHub)'
    )
  }

  // El filtrado de /p/, /reel/, /tv/ lo hace parseInstagramUrl (esos "usuarios"
  // están en SKIP_USERNAMES), así que la query no necesita los -inurl:.
  const query = `"${niche}" "${location}" site:instagram.com`

  const results: { url: string; username: string }[] = []
  const seen = new Set<string>()

  console.log(`  Buscando: "${niche}" + "${location}"`)

  // Google pagina con `start` (1, 11, 21, ...); tope de la API: start ≤ 91 (100 resultados).
  for (let start = 1; start <= maxResults && start <= 91; start += 10) {
    const url =
      `${ENDPOINT}?key=${key}&cx=${cx}&q=${encodeURIComponent(query)}` +
      `&num=10&start=${start}&hl=es&gl=ar`

    const res = await fetch(url)
    const data: any = await res.json().catch(() => ({}))

    if (!res.ok || data.error) {
      const msg = data?.error?.message || `HTTP ${res.status}`
      // 429 = rate limit · 403 = cuota diaria agotada o key restringida.
      // Son bloqueos reales: cortamos el run para que se note, no seguimos a ciegas.
      if (res.status === 429 || res.status === 403) {
        throw new SearchBlockedError(`Google API bloqueó/agotó cuota: ${msg}`)
      }
      // Otros errores (400, 500…): esta búsqueda no sirve, pero el run sigue.
      console.error(`  ✗ Error de la API: ${msg}`)
      break
    }

    const items: any[] = data.items || []
    let newOnPage = 0
    for (const it of items) {
      const profile = parseInstagramUrl(it.link || '')
      if (!profile || seen.has(profile.username)) continue
      seen.add(profile.username)
      results.push(profile)
      newOnPage++
    }

    console.log(`  Página ${Math.ceil(start / 10)}: ${newOnPage} perfiles (${items.length} resultados)`)

    // Menos de 10 resultados = no hay más páginas.
    if (items.length < 10) break
    await randomDelay(400, 900)
  }

  console.log(`  ✓ Total: ${results.length} perfiles`)
  return results
}
