-- pg_cron → Edge Function 호출 (Vault 시크릿 + apikey)
-- security definer 로 cron 실행 역할에서도 Vault 읽기 가능

create or replace function public.invoke_rotate_readonly_password()
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_anon_key text;
  v_request_id bigint;
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
    url := 'https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_secret,
      'apikey', coalesce(v_anon_key, '')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 15000
  ) into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.invoke_rotate_readonly_password() from public;
grant execute on function public.invoke_rotate_readonly_password() to postgres;

do $$
begin
  if exists (select 1 from cron.job where jobname = 'rotate-readonly-password-daily') then
    perform cron.unschedule('rotate-readonly-password-daily');
  end if;
end;
$$;

select cron.schedule(
  'rotate-readonly-password-daily',
  '5 15 * * *',
  $$ select public.invoke_rotate_readonly_password(); $$
);
