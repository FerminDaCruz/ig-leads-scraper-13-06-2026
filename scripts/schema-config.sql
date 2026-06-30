-- ============================================================================
-- Tablas de configuración del scraper: nichos y ubicaciones.
-- Editables desde el dashboard (pestaña "Scraper") y leídas por el scraper.
--
-- Pegá y ejecutá este bloque UNA sola vez en:
--   Supabase → tu proyecto → SQL Editor → New query → Run
-- Después corré el seed:  npm run seed:config
-- ============================================================================

create table if not exists public.niches (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  created_at  timestamptz not null default now()
);

create table if not exists public.locations (
  id                bigint generated always as identity primary key,
  name              text not null unique,
  hidden_by_default boolean not null default false,
  created_at        timestamptz not null default now()
);

-- El dashboard y el scraper acceden con la anon key, igual que leads/searches.
alter table public.niches    disable row level security;
alter table public.locations disable row level security;
