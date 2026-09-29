-- Limpeza diária (03:17 UTC) das exclusões lógicas com mais de 30 dias.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    perform cron.schedule('purge-soft-deleted', '17 3 * * *', 'select private.purge_soft_deleted()');
  end if;
end;
$$;
