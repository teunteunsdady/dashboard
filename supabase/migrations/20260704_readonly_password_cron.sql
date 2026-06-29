-- readOnly 비밀번호 자동 변경 — pg_cron (매일 15:05 UTC = KST 익일 00:05)
-- 함수 내부에서 KST 매월 1일만 실제 비밀번호 변경
--
-- 사전 준비: supabase/scripts/setup-readonly-cron.sql 로 Vault에 cron_secret 등록

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

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
  $$
  select net.http_post(
    url := 'https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || coalesce(
        (
          select decrypted_secret
          from vault.decrypted_secrets
          where name = 'cron_secret'
          limit 1
        ),
        ''
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 10000
  ) as request_id;
  $$
);
