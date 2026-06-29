-- 버스 도착 알림 — 서버(Web Push) 설정 저장 + 발송 상태 + API 캐시

create table if not exists public.bus_alarm_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  days smallint[] not null default '{0,3}',
  threshold_minutes smallint not null default 5
    check (threshold_minutes >= 1 and threshold_minutes <= 30),
  auto_stop boolean not null default true,
  stop_id text not null default '1131-wolgye',
  morning_start smallint not null default 7 check (morning_start >= 0 and morning_start <= 23),
  morning_end smallint not null default 10 check (morning_end >= 0 and morning_end <= 24),
  evening_start smallint not null default 17 check (evening_start >= 0 and evening_start <= 23),
  evening_end smallint not null default 21 check (evening_end >= 0 and evening_end <= 24),
  updated_at timestamptz not null default now()
);

create index if not exists bus_alarm_settings_enabled_idx
  on public.bus_alarm_settings (enabled)
  where enabled = true;

alter table public.bus_alarm_settings enable row level security;

create policy "Users manage own bus alarm settings"
  on public.bus_alarm_settings for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 알림 재발송 방지 (armed: 임계 밖으로 나가면 다시 true)
create table if not exists public.bus_alarm_state (
  user_id uuid not null references auth.users (id) on delete cascade,
  stop_id text not null,
  armed boolean not null default true,
  updated_at timestamptz not null default now(),
  primary key (user_id, stop_id)
);

alter table public.bus_alarm_state enable row level security;

create policy "No client access to bus alarm state"
  on public.bus_alarm_state for all
  to authenticated
  using (false)
  with check (false);

-- Edge Function 간 공유 캐시 (서울시 API 호출 절약)
create table if not exists public.bus_arrival_cache (
  stop_id text primary key,
  arrival1 text not null,
  stop_name text not null,
  route_number text not null,
  travel_direction text not null,
  fetched_at timestamptz not null default now()
);

alter table public.bus_arrival_cache enable row level security;

create policy "No client access to bus arrival cache"
  on public.bus_arrival_cache for all
  to authenticated
  using (false)
  with check (false);
