-- ============================================================================
-- DESHACER schema-canal.sql. Escrito de antemano, para no tener que pensarlo
-- con la app rota. Pegar y correr en Supabase → SQL Editor.
--
-- Devuelve la base al estado previo al canal de contacto. Como la migración fue
-- aditiva, esto solo borra columnas que agregó: nada de lo anterior se toca.
-- Los `drop column` se llevan sus constraints e índices con ellos.
--
-- OJO: se pierde lo que hayas cargado EN ESAS COLUMNAS (a qué canal moviste
-- cada lead, las fechas de recontacto). Los leads, dueños, etapas, fechas y
-- seguimientos quedan intactos. Si querés conservar esos datos antes de tirar
-- las columnas, corré `npm run backup` primero.
--
-- Antes de esto, para volver el CÓDIGO: git checkout pre-canal
-- ============================================================================

alter table public.leads drop column if exists canal;
alter table public.leads drop column if exists canal_motivo;
alter table public.leads drop column if exists canal_at;
alter table public.leads drop column if exists recontactar_at;
alter table public.leads drop column if exists espera_motivo;

alter table public.lead_followups drop column if exists canal;

-- Control: no debería quedar ninguna de las columnas nuevas.
select column_name, table_name
  from information_schema.columns
 where table_schema = 'public'
   and table_name in ('leads','lead_followups')
   and column_name in ('canal','canal_motivo','canal_at','recontactar_at','espera_motivo');
