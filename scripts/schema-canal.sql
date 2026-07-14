-- ============================================================================
-- Canal de contacto (instagram / whatsapp / llamada) + espera (recontactar).
-- Pegá y ejecutá este bloque UNA sola vez en:
--   Supabase → tu proyecto → SQL Editor → New query → Run (sin RLS, como el resto)
-- Es idempotente: se puede correr de nuevo sin romper nada.
--
-- ES ESTRICTAMENTE ADITIVA: solo agrega columnas y escribe en columnas nuevas.
-- No borra ni pisa ningún dato existente. Volver atrás = desplegar el código
-- viejo (ignora estas columnas) o correr scripts/schema-canal-rollback.sql.
-- ============================================================================

-- ── Control ANTES (anotá estos números) ─────────────────────────────────────
select 'antes' as momento, resultado, count(*) as leads
  from public.leads group by resultado order by resultado nulls first;

-- ── leads: canal por el que se sigue el contacto ────────────────────────────
-- El default marca como 'instagram' TODAS las filas que ya existen.
alter table public.leads add column if not exists canal        text not null default 'instagram';
alter table public.leads add column if not exists canal_motivo text;
alter table public.leads add column if not exists canal_at     timestamptz;

alter table public.leads drop constraint if exists leads_canal_check;
alter table public.leads add constraint leads_canal_check
  check (canal in ('instagram','whatsapp','llamada'));

-- Por qué se dejó Instagram: DMs cerrados / hay un CM que no decide / te ignoró.
alter table public.leads drop constraint if exists leads_canal_motivo_check;
alter table public.leads add constraint leads_canal_motivo_check
  check (canal_motivo is null or canal_motivo in ('no_recibe_mensajes','tiene_cm','no_responde_ig'));

-- ── leads: en espera hasta una fecha (ni activo ni muerto) ───────────────────
alter table public.leads add column if not exists recontactar_at timestamptz;
alter table public.leads add column if not exists espera_motivo  text;

alter table public.leads drop constraint if exists leads_espera_motivo_check;
alter table public.leads add constraint leads_espera_motivo_check
  check (espera_motivo is null or espera_motivo in ('mas_adelante','derivado_al_dueno'));

-- ── lead_followups: por qué canal se mandó cada mensaje ─────────────────────
-- El default deja los 159 seguimientos históricos marcados como Instagram.
alter table public.lead_followups add column if not exists canal text not null default 'instagram';

alter table public.lead_followups drop constraint if exists lead_followups_canal_check;
alter table public.lead_followups add constraint lead_followups_canal_check
  check (canal in ('instagram','whatsapp','llamada'));

-- ── Índices ─────────────────────────────────────────────────────────────────
create index if not exists leads_canal_idx
  on public.leads(canal) where canal <> 'instagram';
create index if not exists leads_recontactar_idx
  on public.leads(recontactar_at) where recontactar_at is not null;

-- ── Migración: los "no recibe mensajes" pasan a WhatsApp ────────────────────
-- No es un desenlace: el lead está vivo, solo que no lo alcanzás por IG.
-- OJO: NO se toca la columna resultado (esa limpieza va aparte, más adelante).
-- El guard `canal = 'instagram'` hace que re-correr esto no pise cambios manuales.
update public.leads
   set canal        = 'whatsapp',
       canal_motivo = 'no_recibe_mensajes',
       canal_at     = coalesce(canal_at, resultado_at, now())
 where resultado = 'no_recibe_mensajes'
   and canal = 'instagram';

-- ── Control DESPUÉS ─────────────────────────────────────────────────────────
-- Esperado: 'whatsapp' con motivo 'no_recibe_mensajes' = los que antes tenían
-- ese resultado. Todo lo demás sigue en 'instagram'.
select 'despues' as momento, canal, canal_motivo, count(*) as leads
  from public.leads group by canal, canal_motivo order by canal, canal_motivo;
