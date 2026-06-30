-- ============================================================================
-- Trackeo completo de leads (CRM / pipeline).
-- Pegá y ejecutá este bloque UNA sola vez en:
--   Supabase → tu proyecto → SQL Editor → New query → Run (sin RLS, como el resto)
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================================

-- ── Columnas nuevas en leads ────────────────────────────────────────────────
alter table public.leads add column if not exists nombre_empresa text;
alter table public.leads add column if not exists tiene_web      boolean;
alter table public.leads add column if not exists web_mejorable  boolean;
alter table public.leads add column if not exists activo_redes   boolean;
alter table public.leads add column if not exists notas          text;
alter table public.leads add column if not exists etapa          text not null default 'lead';

-- Fechas por etapa (la de "iniciado" reusa la columna ya existente contacted_at)
alter table public.leads add column if not exists visto_at       timestamptz;
alter table public.leads add column if not exists interesado_at  timestamptz;
alter table public.leads add column if not exists calendly_at    timestamptz;
alter table public.leads add column if not exists agendado_at    timestamptz;
alter table public.leads add column if not exists cerrado_at     timestamptz;

-- Restringe los valores válidos de etapa (idempotente).
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'leads_etapa_check') then
    alter table public.leads add constraint leads_etapa_check
      check (etapa in ('lead','iniciado','visto','interesado','calendly_enviado','agendado','cerrado'));
  end if;
end $$;

-- ── Dueños (0..N por lead) ──────────────────────────────────────────────────
create table if not exists public.lead_owners (
  id          bigint generated always as identity primary key,
  lead_id     bigint not null references public.leads(id) on delete cascade,
  nombre      text,
  numero      text,
  created_at  timestamptz not null default now()
);
create index if not exists lead_owners_lead_id_idx on public.lead_owners(lead_id);

-- ── Seguimientos / Follow-ups ───────────────────────────────────────────────
-- fase: 'iniciado' (compartido iniciado/visto, máx. 1) ·
--       'interesado' (máx. 7) · 'calendly' (máx. 7). El tope lo controla la app.
create table if not exists public.lead_followups (
  id          bigint generated always as identity primary key,
  lead_id     bigint not null references public.leads(id) on delete cascade,
  fase        text not null check (fase in ('iniciado','interesado','calendly')),
  indice      int  not null default 1,
  enviado     boolean not null default true,
  mensaje     text,
  fecha       timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists lead_followups_lead_id_idx on public.lead_followups(lead_id);

-- ── Sin RLS, consistente con leads/searches/niches/locations ────────────────
alter table public.lead_owners    disable row level security;
alter table public.lead_followups disable row level security;

-- ── Backfill de datos existentes ────────────────────────────────────────────
update public.leads set nombre_empresa = '@' || username
  where nombre_empresa is null;

-- Los ya contactados arrancan en 'iniciado'; el resto queda en 'lead'.
update public.leads set etapa = 'iniciado'
  where contactado = true and etapa = 'lead';
