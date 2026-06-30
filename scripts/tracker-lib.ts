import 'dotenv/config'
import { parse } from 'csv-parse/sync'
import { readFileSync, writeFileSync } from 'fs'
import { createClient } from '@supabase/supabase-js'
import ws from 'ws'

// ────────────────────────────────────────────────────────────────────────────
// Rellena los leads existentes con la data de un tracker mensual (CSV exportado
// de Google Sheets). Layout del CSV: dashboard de métricas arriba y, debajo, 5
// listas en paralelo (Prospecto · Iniciado · Interesado · Calendly · Agendado),
// cada una con su propio "Link del Perfil". Un mismo @ puede estar en varios
// bloques; su etapa real = el bloque más avanzado donde aparece.
//
// Dry-run por defecto. Aplica con: npm run fill:mayo -- --apply
// ────────────────────────────────────────────────────────────────────────────

export interface TrackerConfig {
  file: string          // ruta al CSV
  monthName: string     // 'Mayo' | 'Junio'  (etiqueta de notas)
  monthNum: string      // '05' | '06'        (para armar la fecha)
  source: string        // 'tracker-mayo' | 'tracker-junio' (tag idempotente)
  unmatchedOut: string  // ruta donde dejar los @ sin match
}

const STAGES = ['lead', 'iniciado', 'visto', 'interesado', 'calendly_enviado', 'agendado', 'cerrado']
const rank = (s: string) => Math.max(0, STAGES.indexOf(s))
const BLOCKS = ['Prospecto', 'Iniciado', 'Interesado', 'Calendly', 'Agendado'] as const

const clean = (v: unknown) => (v == null ? '' : String(v)).trim()
const uname = (link: string) => {
  const m = clean(link).match(/instagram\.com\/([^/?#]+)/i)
  return m ? m[1].trim().toLowerCase() : null
}
const dayToIso = (day: unknown, monthNum: string) => {
  const n = parseInt(clean(day), 10)
  if (!n || n < 1 || n > 31) return null
  return `2026-${monthNum}-${String(n).padStart(2, '0')}T12:00:00-03:00`
}
const earliest = (a: string | null, b: string | null) => {
  if (!a) return b
  if (!b) return a
  return Date.parse(a) <= Date.parse(b) ? a : b
}
const siNo = (v: unknown): boolean | null => {
  const t = clean(v).toLowerCase()
  if (t === 'sí' || t === 'si' || t === 'true') return true
  if (t === 'no' || t === 'false') return false
  return null
}
// Página web: 'Sí'→true, 'No'→false, casillas vacías ('FALSE'/'')→null (sin dato)
const webBool = (v: unknown): boolean | null => {
  const t = clean(v).toLowerCase()
  if (t === 'sí' || t === 'si') return true
  if (t === 'no') return false
  return null
}

interface Agg {
  username: string
  url: string
  nombreEmpresa: string | null
  numero: string | null
  nombreDueno: string | null
  tieneWeb: boolean | null
  stages: Set<string>
  dates: { contacted: string | null; interesado: string | null; calendly: string | null; agendado: string | null }
  notes: Record<string, string[]>
  followups: { fase: string; indice: number; mensaje: string }[]
}

function getSupabase() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!, { realtime: { transport: ws } })
}

function resolveCols(H: string[]) {
  const inc = (s: string) => H.findIndex((c) => clean(c).includes(s))
  const iniStart = inc('Nombre (Iniciado)')
  const intStart = inc('Nombre (Interesado)')
  const calStart = inc('Nombre (Calendly')
  const agStart = inc('Nombre (Agendado)')
  const end = H.length
  const findIn = (lo: number, hi: number, label: string) => {
    for (let i = lo; i < hi; i++) if (clean(H[i]) === label) return i
    return -1
  }
  const fupB: number[] = []
  const fupC: number[] = []
  for (let k = 1; k <= 7; k++) fupB.push(findIn(intStart, calStart, `${k}B`))
  for (let k = 1; k <= 7; k++) fupC.push(findIn(calStart, agStart, `${k}C`))

  return {
    prosp: {
      numero: findIn(0, iniStart, 'Número'),
      nombreDueno: findIn(0, iniStart, 'Nombre'),
      nombreEmpresa: findIn(0, iniStart, 'Nombre empresa'),
      link: findIn(0, iniStart, 'Link del Perfil'),
      web: findIn(0, iniStart, 'Página web'),
      notas: findIn(0, iniStart, 'Notas'),
    },
    ini: {
      link: findIn(iniStart, intStart, 'Link del Perfil'),
      fecha: findIn(iniStart, intStart, 'Fecha de Contacto'),
      visto: findIn(iniStart, intStart, 'FTF Visto (AV)'),
      fupNo: findIn(iniStart, intStart, 'FUP FTF No Visto'),
      fupSi: findIn(iniStart, intStart, 'FUP FTF Visto'),
      notas: findIn(iniStart, intStart, 'Notas'),
    },
    int: {
      link: findIn(intStart, calStart, 'Link del Perfil'),
      fecha: findIn(intStart, calStart, 'Fecha de Interés'),
      notas: findIn(intStart, calStart, 'Notas'),
      fup: fupB,
    },
    cal: {
      link: findIn(calStart, agStart, 'Link del Perfil'),
      fecha: findIn(calStart, agStart, 'Fecha de envío de Calendly'),
      notas: findIn(calStart, agStart, 'Notas'),
      fup: fupC,
    },
    ag: {
      link: findIn(agStart, end, 'Link del Perfil'),
      fecha: findIn(agStart, end, 'Fecha de Agenda'),
      notas: findIn(agStart, end, 'Notas'),
      cerrado: findIn(agStart, end, 'Cerrado'),
    },
  }
}

function emptyAgg(username: string): Agg {
  return {
    username,
    url: `https://www.instagram.com/${username}/`,
    nombreEmpresa: null,
    numero: null,
    nombreDueno: null,
    tieneWeb: null,
    stages: new Set(),
    dates: { contacted: null, interesado: null, calendly: null, agendado: null },
    notes: { Prospecto: [], Iniciado: [], Interesado: [], Calendly: [], Agendado: [] },
    followups: [],
  }
}

function buildAggs(rows: string[][], hIdx: number, monthNum: string): Map<string, Agg> {
  const C = resolveCols(rows[hIdx])
  const data = rows.slice(hIdx + 1)
  const map = new Map<string, Agg>()
  const get = (u: string) => {
    let a = map.get(u)
    if (!a) { a = emptyAgg(u); map.set(u, a) }
    return a
  }
  const cell = (r: string[], i: number) => (i >= 0 ? clean(r[i]) : '')

  for (const r of data) {
    // Prospecto → 'lead'
    const up = uname(cell(r, C.prosp.link))
    if (up) {
      const a = get(up)
      a.stages.add('lead')
      if (!a.nombreEmpresa && cell(r, C.prosp.nombreEmpresa)) a.nombreEmpresa = cell(r, C.prosp.nombreEmpresa)
      if (cell(r, C.prosp.numero)) a.numero = cell(r, C.prosp.numero)
      if (cell(r, C.prosp.nombreDueno)) a.nombreDueno = cell(r, C.prosp.nombreDueno)
      const w = webBool(cell(r, C.prosp.web))
      if (w !== null) a.tieneWeb = w
      if (cell(r, C.prosp.notas)) a.notes.Prospecto.push(cell(r, C.prosp.notas))
    }
    // Iniciado → 'iniciado' (+ 'visto' si FTF Visto = Sí)
    const ui = uname(cell(r, C.ini.link))
    if (ui) {
      const a = get(ui)
      a.stages.add('iniciado')
      if (!a.nombreEmpresa && C.ini.link - 1 >= 0 && cell(r, C.ini.link - 1)) a.nombreEmpresa = cell(r, C.ini.link - 1)
      const visto = siNo(cell(r, C.ini.visto)) === true
      if (visto) a.stages.add('visto')
      a.dates.contacted = earliest(a.dates.contacted, dayToIso(cell(r, C.ini.fecha), monthNum))
      const msg = visto ? cell(r, C.ini.fupSi) : cell(r, C.ini.fupNo)
      if (msg) a.followups.push({ fase: 'iniciado', indice: 1, mensaje: msg })
      if (cell(r, C.ini.notas)) a.notes.Iniciado.push(cell(r, C.ini.notas))
    }
    // Interesado → 'interesado'
    const ub = uname(cell(r, C.int.link))
    if (ub) {
      const a = get(ub)
      a.stages.add('interesado')
      a.dates.interesado = earliest(a.dates.interesado, dayToIso(cell(r, C.int.fecha), monthNum))
      C.int.fup.forEach((ci, k) => { const m = cell(r, ci); if (m) a.followups.push({ fase: 'interesado', indice: k + 1, mensaje: m }) })
      if (cell(r, C.int.notas)) a.notes.Interesado.push(cell(r, C.int.notas))
    }
    // Calendly → 'calendly_enviado'
    const uc = uname(cell(r, C.cal.link))
    if (uc) {
      const a = get(uc)
      a.stages.add('calendly_enviado')
      a.dates.calendly = earliest(a.dates.calendly, dayToIso(cell(r, C.cal.fecha), monthNum))
      C.cal.fup.forEach((ci, k) => { const m = cell(r, ci); if (m) a.followups.push({ fase: 'calendly', indice: k + 1, mensaje: m }) })
      if (cell(r, C.cal.notas)) a.notes.Calendly.push(cell(r, C.cal.notas))
    }
    // Agendado → 'agendado' (+ 'cerrado' si Cerrado = Sí)
    const ud = uname(cell(r, C.ag.link))
    if (ud) {
      const a = get(ud)
      a.stages.add('agendado')
      a.dates.agendado = earliest(a.dates.agendado, dayToIso(cell(r, C.ag.fecha), monthNum))
      if (C.ag.cerrado >= 0 && siNo(cell(r, C.ag.cerrado)) === true) a.stages.add('cerrado')
      if (cell(r, C.ag.notas)) a.notes.Agendado.push(cell(r, C.ag.notas))
    }
  }
  return map
}

function mergeNotas(existing: string | null, monthName: string, newLines: string[]): string | null {
  const tag = `[${monthName} · `
  const kept = clean(existing).split('\n').filter((l) => l && !l.startsWith(tag))
  const all = [...kept, ...newLines]
  return all.length ? all.join('\n') : null
}

async function fetchAllLeads(sb: ReturnType<typeof getSupabase>) {
  const cols = 'id, username, etapa, notas, nombre_empresa, tiene_web, contacted_at, visto_at, interesado_at, calendly_at, agendado_at, cerrado_at'
  const all: any[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('leads').select(cols).range(from, from + 999)
    if (error) throw new Error(error.message)
    all.push(...(data || []))
    if (!data || data.length < 1000) break
  }
  const byUser = new Map<string, any>()
  for (const r of all) byUser.set((r.username || '').toLowerCase(), r)
  return byUser
}

export async function runTracker(cfg: TrackerConfig) {
  const apply = process.argv.includes('--apply')
  console.log(`\n${'='.repeat(64)}`)
  console.log(`Tracker ${cfg.monthName}  ·  ${apply ? '⚠️  MODO APPLY (escribe en la base)' : 'DRY-RUN (no escribe nada)'}`)
  console.log('='.repeat(64))

  const rows = parse(readFileSync(cfg.file, 'utf-8'), { relax_column_count: true, skip_empty_lines: false }) as string[][]
  const hIdx = rows.findIndex((r) => r.includes('Nombre empresa'))
  if (hIdx < 0) throw new Error('No encontré la fila de encabezados ("Nombre empresa")')

  const aggs = buildAggs(rows, hIdx, cfg.monthNum)
  const sb = getSupabase()
  const byUser = await fetchAllLeads(sb)

  const matched: { agg: Agg; lead: any }[] = []
  const unmatched: Agg[] = []
  for (const a of aggs.values()) {
    const lead = byUser.get(a.username)
    if (lead) matched.push({ agg: a, lead })
    else unmatched.push(a)
  }

  // Anotar los @ sin match en un archivo local
  const csv = ['username,url,nombre_empresa,telefono,etapa_en_tracker']
    .concat(unmatched.map((a) => {
      const etapa = STAGES[Math.max(...[...a.stages].map(rank), 0)]
      const safe = (s: string | null) => `"${clean(s).replace(/"/g, '""')}"`
      return [a.username, a.url, safe(a.nombreEmpresa), safe(a.numero), etapa].join(',')
    }))
  writeFileSync(cfg.unmatchedOut, csv.join('\n'), 'utf-8')

  // Resumen
  const etapaDist: Record<string, number> = {}
  let owners = 0, fups = 0
  for (const { agg } of matched) {
    const et = STAGES[Math.max(...[...agg.stages].map(rank), 0)]
    etapaDist[et] = (etapaDist[et] || 0) + 1
    if (agg.numero || agg.nombreDueno) owners++
    fups += agg.followups.length
  }
  console.log(`\n@ en el tracker: ${aggs.size}`)
  console.log(`  ✓ matchean leads en la base: ${matched.length}`)
  console.log(`  ✗ sin match (guardados en ${cfg.unmatchedOut}): ${unmatched.length}`)
  console.log(`\nEtapa final que quedaría (de los matcheados):`)
  for (const s of STAGES) if (etapaDist[s]) console.log(`  ${s.padEnd(18)} ${etapaDist[s]}`)
  console.log(`\nDueños a cargar: ${owners}  ·  Seguimientos a cargar: ${fups}`)

  // Ejemplos (hasta 3 con etapa avanzada)
  const ejemplos = matched.filter((m) => m.agg.stages.size > 1).slice(0, 3)
  console.log(`\nEjemplos:`)
  for (const { agg, lead } of ejemplos) {
    const et = STAGES[Math.max(...[...agg.stages].map(rank), 0)]
    console.log(`  @${agg.username}: etapa ${lead.etapa} → ${et} · contacto=${agg.dates.contacted?.slice(0,10) || '—'} · dueño=${agg.numero || '—'} · followups=${agg.followups.length}`)
  }

  if (!apply) {
    console.log(`\n(DRY-RUN: no se escribió nada en la base. Para aplicar: agregá  -- --apply)`)
    process.exit(0)
  }

  // ── APLICAR ───────────────────────────────────────────────────────────────
  console.log(`\nAplicando...`)
  let done = 0
  for (const { agg, lead } of matched) {
    const newRank = Math.max(rank(lead.etapa || 'lead'), ...[...agg.stages].map(rank))
    const newLines: string[] = []
    for (const b of BLOCKS) for (const t of agg.notes[b]) newLines.push(`[${cfg.monthName} · ${b}] ${t}`)

    const update: any = {
      etapa: STAGES[newRank],
      contacted_at: earliest(lead.contacted_at, agg.dates.contacted),
      interesado_at: earliest(lead.interesado_at, agg.dates.interesado),
      calendly_at: earliest(lead.calendly_at, agg.dates.calendly),
      agendado_at: earliest(lead.agendado_at, agg.dates.agendado),
      notas: mergeNotas(lead.notas, cfg.monthName, newLines),
    }
    if (agg.nombreEmpresa && agg.nombreEmpresa.toLowerCase() !== agg.username) update.nombre_empresa = agg.nombreEmpresa
    if (agg.tieneWeb !== null) update.tiene_web = lead.tiene_web === true ? true : agg.tieneWeb

    await sb.from('leads').update(update).eq('id', lead.id)

    // Dueños y seguimientos: borrar solo lo de este mes y reinsertar (idempotente)
    await sb.from('lead_owners').delete().eq('lead_id', lead.id).eq('source', cfg.source)
    if (agg.numero || agg.nombreDueno) {
      await sb.from('lead_owners').insert({ lead_id: lead.id, numero: agg.numero, nombre: agg.nombreDueno, source: cfg.source })
    }
    await sb.from('lead_followups').delete().eq('lead_id', lead.id).eq('source', cfg.source)
    if (agg.followups.length) {
      await sb.from('lead_followups').insert(
        agg.followups.map((f) => ({ lead_id: lead.id, fase: f.fase, indice: f.indice, mensaje: f.mensaje, enviado: true, fecha: null, source: cfg.source }))
      )
    }
    done++
    if (done % 25 === 0) process.stdout.write(`\r  ${done}/${matched.length}`)
  }
  console.log(`\r  ${done}/${matched.length}`)
  console.log(`\n✅ Listo (${cfg.monthName}). ${unmatched.length} sin match en ${cfg.unmatchedOut}`)
  process.exit(0)
}
