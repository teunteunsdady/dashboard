-- Web Push: 구독 저장 + 발송 중복 방지 + 알림 시각 계산

create or replace function public.event_notify_at(
  p_starts_at timestamptz,
  p_all_day boolean,
  p_tz text default 'Asia/Seoul'
) returns timestamptz
language sql
stable
as $$
  select case
    when p_all_day then
      ((date_trunc('day', p_starts_at at time zone p_tz) + interval '9 hours') at time zone p_tz)
    else
      p_starts_at
  end;
$$;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage own push subscriptions"
  on public.push_subscriptions for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.event_push_dispatches (
  event_id uuid not null references public.events (id) on delete cascade,
  notify_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (event_id, notify_at)
);

create index if not exists event_push_dispatches_notify_at_idx
  on public.event_push_dispatches (notify_at);

alter table public.event_push_dispatches enable row level security;

-- 발송 기록은 서버(service role)만 쓰고, 클라이언트는 읽지 않음
create policy "No client access to push dispatches"
  on public.event_push_dispatches for all
  to authenticated
  using (false)
  with check (false);
