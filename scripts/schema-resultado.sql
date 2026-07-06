-- ============================================================================
-- Resultado del contacto: marca un lead como "No interesado" o "Bloqueado".
-- Es ortogonal a la etapa: el lead sigue calificado e iniciado, solo se marca
-- que el contacto terminó en no-interés o bloqueo.
-- Pegá y ejecutá este bloque UNA sola vez en:
--   Supabase → tu proyecto → SQL Editor → New query → Run (sin RLS, como el resto)
-- Es idempotente: se puede correr de nuevo sin romper nada.
-- ============================================================================

alter table public.leads add column if not exists resultado    text;
alter table public.leads add column if not exists resultado_at timestamptz;

-- Solo valores válidos (o null = contacto activo).
alter table public.leads drop constraint if exists leads_resultado_check;
alter table public.leads add constraint leads_resultado_check
  check (resultado is null or resultado in ('no_interesado','bloqueado','no_recibe_mensajes'));

create index if not exists leads_resultado_idx
  on public.leads(resultado) where resultado is not null;
