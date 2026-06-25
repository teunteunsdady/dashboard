-- Supabase SQL Editor에서 실행하세요.
-- Dashboard 일정 테이블 + 본인만 접근하는 RLS 정책

create table if not exists public.events (
  id text primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  title text not null,
  start_date text not null,
  end_date text,
  category text not null check (
    category in ('personal', 'asset', 'subscription', 'project')
  ),
  description text,
  all_day boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_user_id_idx on public.events (user_id);

alter table public.events enable row level security;

create policy "Users manage own events"
  on public.events
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- updated_at 자동 갱신
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists events_updated_at on public.events;
create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();
