// Etapas del pipeline (orden = avance). Compartido entre cliente y servidor.
export const ETAPAS = ['lead', 'iniciado', 'visto', 'interesado', 'calendly_enviado', 'agendado', 'cerrado'] as const
export type Etapa = (typeof ETAPAS)[number]

export const ETAPA_LABEL: Record<Etapa, string> = {
  lead: 'Lead',
  iniciado: 'Iniciado',
  visto: 'Visto',
  interesado: 'Interesado',
  calendly_enviado: 'Calendly',
  agendado: 'Agendado',
  cerrado: 'Cerrado',
}

// Columna de fecha asociada a cada etapa (lead no tiene; iniciado reusa contacted_at).
export const ETAPA_FECHA: Record<Etapa, string | null> = {
  lead: null,
  iniciado: 'contacted_at',
  visto: 'visto_at',
  interesado: 'interesado_at',
  calendly_enviado: 'calendly_at',
  agendado: 'agendado_at',
  cerrado: 'cerrado_at',
}

export const FECHA_COLS = ['contacted_at', 'visto_at', 'interesado_at', 'calendly_at', 'agendado_at', 'cerrado_at'] as const

// Fases de seguimiento y su tope. 'iniciado' se comparte con 'visto'.
export const FASES = ['iniciado', 'interesado', 'calendly'] as const
export type Fase = (typeof FASES)[number]
export const FASE_LABEL: Record<Fase, string> = {
  iniciado: 'Iniciado / Visto',
  interesado: 'Interesado',
  calendly: 'Calendly enviado',
}
export const FASE_MAX: Record<Fase, number> = { iniciado: 1, interesado: 7, calendly: 7 }

export const isEtapa = (v: string): v is Etapa => (ETAPAS as readonly string[]).includes(v)

// ── Metas (KPI) del embudo ────────────────────────────────────────────────────
// 'iniciado' es un número total; el resto es un % sobre los iniciados del mes.
export type KpiTipo = 'num' | 'pct'
export const KPI_META: { etapa: string; label: string; tipo: KpiTipo }[] = [
  { etapa: 'iniciado', label: 'Iniciados', tipo: 'num' },
  { etapa: 'visto', label: 'Vistos', tipo: 'pct' },
  { etapa: 'interesado', label: 'Interesados', tipo: 'pct' },
  { etapa: 'calendly_enviado', label: 'Calendly', tipo: 'pct' },
  { etapa: 'agendado', label: 'Agendados', tipo: 'pct' },
  { etapa: 'cerrado', label: 'Cerrados', tipo: 'pct' },
]
export const kpiEsNumero = (etapa: string) => etapa === 'iniciado'
// Valores por defecto (fallback cuando un mes no tiene metas propias cargadas).
export const DEFAULT_KPIS: Record<string, number> = {
  iniciado: 100,
  visto: 30,
  interesado: 6,
  calendly_enviado: 3,
  agendado: 2,
  cerrado: 1,
}
export const KPI_ETAPAS = KPI_META.map((k) => k.etapa)

// Avance rápido: a qué etapa pasa y con qué texto en el botón de la tarjeta.
export const SIGUIENTE: Partial<Record<Etapa, { etapa: Etapa; label: string }>> = {
  lead: { etapa: 'iniciado', label: 'Contactado' },
  iniciado: { etapa: 'visto', label: 'Visto' },
  visto: { etapa: 'interesado', label: 'Interesado' },
  interesado: { etapa: 'calendly_enviado', label: 'Calendly' },
  calendly_enviado: { etapa: 'agendado', label: 'Agendado' },
  agendado: { etapa: 'cerrado', label: 'Cerrado' },
}
