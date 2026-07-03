// Estadísticas por nicho / ubicación para la sección Scraper.
// El "total" cuenta solo leads revisados (calificados + descartados); los que
// todavía no se calificaron no entran. rate = calificados / revisados.

export interface GroupStat {
  name: string
  total: number // revisados = calificados + descartados
  calificados: number
  descartados: number
  contactados: number
  rate: number
}

function parseList(t: string) {
  return (t || '').split(',').map((s) => s.trim()).filter(Boolean)
}

export const MIN_TOTAL = 10

export function buildGroupStats(
  leads: { nichos: string; ubicaciones: string; calificado: boolean | null; contactado: boolean }[],
  field: 'nichos' | 'ubicaciones'
): GroupStat[] {
  const map = new Map<string, { calificados: number; descartados: number; contactados: number }>()
  for (const l of leads) {
    // Solo cuentan los ya revisados (calificado true/false); null se ignora.
    if (l.calificado !== true && l.calificado !== false) continue
    for (const key of parseList(l[field])) {
      if (!map.has(key)) map.set(key, { calificados: 0, descartados: 0, contactados: 0 })
      const e = map.get(key)!
      if (l.calificado === true) e.calificados++
      else e.descartados++
      if (l.contactado) e.contactados++
    }
  }
  return Array.from(map.entries())
    .map(([name, s]) => {
      const total = s.calificados + s.descartados
      return { name, total, ...s, rate: total > 0 ? Math.round((s.calificados / total) * 100) : 0 }
    })
    .filter((s) => s.total >= MIN_TOTAL)
    .sort((a, b) => b.rate - a.rate)
}
