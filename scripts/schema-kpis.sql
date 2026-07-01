-- ============================================================================
-- Metas (KPI) del embudo por mes. Editables desde el dashboard (pestaña
-- "Métricas", al seleccionar un mes).
--
-- Pegá y ejecutá este bloque UNA sola vez en:
--   Supabase → tu proyecto → SQL Editor → New query → Run (sin RLS, como el resto)
-- Es idempotente: se puede correr de nuevo sin romper nada.
--
-- valor:
--   · etapa = 'iniciado'  → número total objetivo de iniciados del mes.
--   · resto de etapas     → % objetivo sobre los iniciados del mes.
-- ============================================================================

create table if not exists public.kpis (
  mes         text not null,          -- 'YYYY-MM'
  etapa       text not null,          -- 'iniciado','visto','interesado','calendly_enviado','agendado','cerrado'
  valor       numeric not null,
  updated_at  timestamptz not null default now(),
  primary key (mes, etapa)
);

-- Consistente con el resto de tablas (acceso con la anon key, sin RLS).
alter table public.kpis disable row level security;
