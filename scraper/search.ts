// Fuente de búsqueda: Serper.dev (API de resultados de Google, JSON).
// Tier gratis: ~2.500 búsquedas de regalo al registrarse, sin tarjeta.

// Error que corta el run entero: key inválida, créditos agotados o rate-limit.
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

const ENDPOINT = 'https://google.serper.dev/search'

// Busca perfiles de Instagram. Devuelve { url, username }[].
// Una sola llamada por búsqueda (1 crédito): pide hasta `maxResults` resultados.
export async function searchWeb(
  niche: string,
  location: string,
  maxResults = 20
): Promise<{ url: string; username: string }[]> {
  const key = process.env.SERPER_API_KEY
  if (!key) {
    throw new SearchBlockedError(
      'Falta SERPER_API_KEY en el entorno (revisá .env o los secrets de GitHub)'
    )
  }

  // El tier gratis de Serper NO permite operadores (site:, comillas exactas, etc.):
  // devuelve "Query pattern not allowed for free accounts". Usamos keywords planas
  // + la palabra "instagram" para sesgar los resultados a perfiles de IG; el
  // filtrado a instagram.com y el descarte de /p/, /reel/, /tv/ lo hace
  // parseInstagramUrl más abajo.
  const query = `${niche} ${location} instagram`

  console.log(`  Buscando: "${niche}" + "${location}"`)

  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: query, num: Math.min(maxResults, 100), gl: 'ar', hl: 'es' }),
  })
  const data: any = await res.json().catch(() => ({}))

  if (!res.ok) {
    const msg = data?.message || data?.error || `HTTP ${res.status}`
    // 401/403 = key inválida · 429 = rate-limit o créditos agotados.
    // Son bloqueos reales: cortamos el run para que se note.
    if (res.status === 401 || res.status === 403 || res.status === 429) {
      throw new SearchBlockedError(`Serper API bloqueó/agotó créditos: ${msg}`)
    }
    // Otros errores (400, 500…): esta búsqueda no sirve, pero el run sigue.
    console.error(`  ✗ Error de la API: ${msg}`)
    return []
  }

  const items: any[] = data?.organic || []
  const results: { url: string; username: string }[] = []
  const seen = new Set<string>()
  for (const it of items) {
    const profile = parseInstagramUrl(it.link || '')
    if (!profile || seen.has(profile.username)) continue
    seen.add(profile.username)
    results.push(profile)
  }

  console.log(`  ✓ Total: ${results.length} perfiles (${items.length} resultados)`)
  return results
}
