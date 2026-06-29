-- Web Push + 버스 도착 알림 — pg_cron 5분 (cron-job.org 1개로 통합 가능)

create or replace function public.invoke_scheduled_push_reminders()
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_anon_key text;
  v_events_id bigint;
  v_bus_id bigint;
  v_base text := 'https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/';
begin
  select decrypted_secret into v_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if v_secret is null or v_secret = '' then
    raise exception 'cron_secret not found in vault. supabase/scripts/setup-readonly-cron.sql 실행 필요';
  end if;

  select decrypted_secret into v_anon_key
  from vault.decrypted_secrets
  where name = 'supabase_anon_key'
  limit 1;

  select net.http_post(
    url := v_base || 'send-event-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret,
      'apikey', coalesce(v_anon_key, '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) into v_events_id;

  select net.http_post(
    url := v_base || 'send-bus-arrival-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret,
      'apikey', coalesce(v_anon_key, '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 25000
  ) into v_bus_id;

  return jsonb_build_object(
    'events_request_id', v_events_id,
    'bus_request_id', v_bus_id
  );
end;
$$;

revoke all on function public.invoke_scheduled_push_reminders() from public;
grant execute on function public.invoke_scheduled_push_reminders() to postgres;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'send-push-reminders-5min') then
    perform cron.unschedule('send-push-reminders-5min');
  end if;
end;
$$;

select cron.schedule(
  'send-push-reminders-5min',
  '*/5 * * * *',
  $$ select public.invoke_scheduled_push_reminders(); $$
);
