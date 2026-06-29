-- 일정 브라우저 알림 on/off
alter table public.events
  add column if not exists notify_enabled boolean not null default false;
