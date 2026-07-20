-- ============================================================================
-- "Visto" deja de ser una ETAPA y pasa a ser una CARACTERÍSTICA (columna visto_at).
-- Ver un mensaje sin responder no es un avance del embudo: es una señal que se
-- cuenta en métricas (tasa de apertura / OP), pero el lead sigue en 'iniciado'.
--
-- Ejecutar UNA vez en: Supabase → SQL Editor → New query → Run.
-- Es idempotente: se puede volver a correr sin romper nada.
-- Correlo ANTES (o junto) con el deploy del código nuevo: el código ya no conoce
-- la etapa 'visto', así que los leads que sigan en esa etapa quedarían sin tab.
-- ============================================================================

begin;

-- 1. Backfill de visto_at para los que estaban marcados como 'visto' por ETAPA
--    pero sin fecha de apertura. El loader histórico marcaba el visto solo con la
--    etapa (nunca escribía visto_at), así que sin esto perderían la señal de
--    apertura al volver a 'iniciado'. No hay fecha propia de apertura: se usa la
--    de contacto como mejor aproximación.
update public.leads
   set visto_at = coalesce(visto_at, contacted_at, now())
 where etapa = 'visto' and visto_at is null;

-- 2. Los que estaban en 'visto' vuelven a 'iniciado' (conservan visto_at).
update public.leads set etapa = 'iniciado' where etapa = 'visto';

-- 3. Llegar a 'interesado' o más allá implica que el mensaje fue visto: si falta
--    visto_at, se completa para que la métrica de apertura quede coherente
--    (apertura ≥ respuesta positiva).
update public.leads
   set visto_at = coalesce(visto_at, interesado_at, contacted_at, now())
 where etapa in ('interesado','calendly_enviado','agendado','cerrado')
   and visto_at is null;

-- 4. Recrear el CHECK de etapa sin 'visto'.
alter table public.leads drop constraint if exists leads_etapa_check;
alter table public.leads add constraint leads_etapa_check
  check (etapa in ('lead','iniciado','interesado','calendly_enviado','agendado','cerrado'));

commit;
