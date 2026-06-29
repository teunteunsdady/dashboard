-- =============================================================================
-- readOnly 비밀번호 cron — Vault 시크릿 등록 (1회)
--
-- 1) 아래 YOUR_CRON_SECRET 을 .env 의 CRON_SECRET 값으로 바꿉니다.
-- 2) Supabase SQL Editor 또는 CLI에서 실행합니다.
--
--    npx supabase db query --linked -f supabase/scripts/setup-readonly-cron.sql
--    (파일 안 값을 먼저 교체한 뒤)
--
-- 3) 등록 확인:
--    select name from vault.secrets where name = 'cron_secret';
--    select jobname, schedule, active from cron.job;
-- =============================================================================

-- 기존 시크릿이 있으면 삭제 후 재등록 (이름 충돌 방지)
do $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'cron_secret' limit 1;
  if v_id is not null then
    perform vault.delete_secret(v_id);
  end if;
end;
$$;

select vault.create_secret(
  'YOUR_CRON_SECRET',
  'cron_secret',
  'Edge Function cron 인증 (rotate-readonly-password, send-event-reminders)'
);

-- (선택) apikey 헤더용 — Supabase Dashboard → Settings → API → Publishable key
do $$
declare
  v_id uuid;
begin
  select id into v_id from vault.secrets where name = 'supabase_anon_key' limit 1;
  if v_id is not null then
    perform vault.delete_secret(v_id);
  end if;
end;
$$;

select vault.create_secret(
  'YOUR_SUPABASE_ANON_KEY',
  'supabase_anon_key',
  'Edge Function 호출용 publishable/anon key'
);
