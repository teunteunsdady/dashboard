-- =============================================================================
-- Personal Dashboard — Supabase Schema (v2)
-- Supabase 대시보드 → SQL Editor 에서 전체 실행
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 기존 스키마 정리 (재설계 시)
-- 테이블 DROP CASCADE 시 연결된 트리거도 함께 삭제됩니다.
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.event_push_dispatches cascade;
drop table if exists public.push_subscriptions cascade;
drop table if exists public.ledger_entries cascade;
drop table if exists public.ledger_budgets cascade;
drop table if exists public.ledger_recurring cascade;
drop table if exists public.events cascade;
drop table if exists public.projects cascade;
drop table if exists public.skills cascade;
drop table if exists public.profiles cascade;

drop function if exists public.event_notify_at(timestamptz, boolean, text) cascade;
drop function if exists public.set_updated_at() cascade;
drop function if exists public.handle_new_user() cascade;

-- -----------------------------------------------------------------------------
-- 1. 공통: updated_at 자동 갱신
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 2. profiles — 사용자 프로필 (auth.users 1:1)
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  title text not null default '',
  bio text,
  email text,
  github text,
  linkedin text,
  avatar_image text,
  avatar_emoji text,
  app_role text not null default 'owner'
    check (app_role in ('owner', 'readonly')),
  data_owner_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_readonly_owner_check check (
    (app_role = 'owner' and data_owner_id is null)
    or (app_role = 'readonly' and data_owner_id is not null)
  )
);

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

create policy "Users read own profile"
  on public.profiles for select
  to authenticated
  using (auth.uid() = id);

create policy "Users insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

create or replace function public.can_write_data()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.app_role = 'owner' from public.profiles p where p.id = auth.uid()),
    true
  );
$$;

create or replace function public.data_owner_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select p.data_owner_id
      from public.profiles p
      where p.id = auth.uid() and p.app_role = 'readonly'
    ),
    auth.uid()
  );
$$;

create policy "Owners update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id and public.can_write_data())
  with check (auth.uid() = id and public.can_write_data());

-- -----------------------------------------------------------------------------
-- 3. skills — 기술 스택
-- -----------------------------------------------------------------------------
create table public.skills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null check (
    category in ('frontend', 'backend', 'devops', 'design', 'other')
  ),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create index skills_user_id_idx on public.skills (user_id);

alter table public.skills enable row level security;

create policy "Users manage own skills"
  on public.skills for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 4. projects — 포트폴리오 프로젝트
-- -----------------------------------------------------------------------------
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  description text not null default '',
  tags text[] not null default '{}',
  link text,
  github text,
  period text not null default '',
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index projects_user_id_idx on public.projects (user_id);

create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

alter table public.projects enable row level security;

create policy "Users manage own projects"
  on public.projects for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- -----------------------------------------------------------------------------
-- 5. events — 캘린더 일정
-- -----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  category text not null check (
    category in ('personal', 'company', 'subscription', 'career', 'family', 'church')
  ),
  description text,
  all_day boolean not null default true,
  notify_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_ends_after_starts check (
    ends_at is null or ends_at >= starts_at
  )
);

create index events_user_id_idx on public.events (user_id);
create index events_starts_at_idx on public.events (starts_at);

create trigger events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

create policy "Users read events"
  on public.events for select
  to authenticated
  using (user_id = public.data_owner_id());

create policy "Owners insert events"
  on public.events for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners update events"
  on public.events for update
  to authenticated
  using (user_id = auth.uid() and public.can_write_data())
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners delete events"
  on public.events for delete
  to authenticated
  using (user_id = auth.uid() and public.can_write_data());

-- -----------------------------------------------------------------------------
-- 5b. Web Push — 백그라운드 일정 알림
-- -----------------------------------------------------------------------------
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

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth_key text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users read own push subscriptions"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "Owners manage push subscriptions"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id and public.can_write_data());

create policy "Owners update push subscriptions"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id and public.can_write_data())
  with check (auth.uid() = user_id and public.can_write_data());

create policy "Owners delete push subscriptions"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id and public.can_write_data());

create table public.event_push_dispatches (
  event_id uuid not null references public.events (id) on delete cascade,
  notify_at timestamptz not null,
  sent_at timestamptz not null default now(),
  primary key (event_id, notify_at)
);

create index event_push_dispatches_notify_at_idx on public.event_push_dispatches (notify_at);

alter table public.event_push_dispatches enable row level security;

create policy "No client access to push dispatches"
  on public.event_push_dispatches for all
  to authenticated
  using (false)
  with check (false);

-- -----------------------------------------------------------------------------
-- 6. ledger — Ledger (가계부)
-- -----------------------------------------------------------------------------
create table public.ledger_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  type text not null check (type in ('income', 'expense')),
  category text not null check (
    category in (
      'food', 'transport', 'housing', 'shopping', 'health',
      'entertainment', 'subscription', 'education', 'expense_other',
      'salary', 'side_income', 'investment', 'income_other'
    )
  ),
  amount numeric(12, 2) not null check (amount > 0),
  day_of_month int not null check (day_of_month between 1 and 31),
  active boolean not null default true,
  memo text,
  last_applied_month text check (last_applied_month is null or last_applied_month ~ '^\d{4}-\d{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ledger_recurring_user_id_idx on public.ledger_recurring (user_id);

create table public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  category text not null check (
    category in (
      'food', 'transport', 'housing', 'shopping', 'health',
      'entertainment', 'subscription', 'education', 'expense_other',
      'salary', 'side_income', 'investment', 'income_other'
    )
  ),
  amount numeric(12, 2) not null check (amount > 0),
  occurred_on date not null,
  memo text,
  recurring_id uuid references public.ledger_recurring (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index ledger_entries_user_id_idx on public.ledger_entries (user_id);
create index ledger_entries_occurred_on_idx on public.ledger_entries (occurred_on);

create table public.ledger_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  month text not null check (month ~ '^\d{4}-\d{2}$'),
  category text not null check (
    category in (
      'total',
      'food', 'transport', 'housing', 'shopping', 'health',
      'entertainment', 'subscription', 'education', 'expense_other',
      'salary', 'side_income', 'investment', 'income_other'
    )
  ),
  amount numeric(12, 2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month, category)
);

create index ledger_budgets_user_month_idx on public.ledger_budgets (user_id, month);

create trigger ledger_entries_updated_at
  before update on public.ledger_entries
  for each row execute function public.set_updated_at();

create trigger ledger_budgets_updated_at
  before update on public.ledger_budgets
  for each row execute function public.set_updated_at();

create trigger ledger_recurring_updated_at
  before update on public.ledger_recurring
  for each row execute function public.set_updated_at();

alter table public.ledger_entries enable row level security;
alter table public.ledger_budgets enable row level security;
alter table public.ledger_recurring enable row level security;

create policy "Users read ledger entries"
  on public.ledger_entries for select
  to authenticated
  using (user_id = public.data_owner_id());

create policy "Owners insert ledger entries"
  on public.ledger_entries for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners update ledger entries"
  on public.ledger_entries for update
  to authenticated
  using (user_id = auth.uid() and public.can_write_data())
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners delete ledger entries"
  on public.ledger_entries for delete
  to authenticated
  using (user_id = auth.uid() and public.can_write_data());

create policy "Users read ledger budgets"
  on public.ledger_budgets for select
  to authenticated
  using (user_id = public.data_owner_id());

create policy "Owners insert ledger budgets"
  on public.ledger_budgets for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners update ledger budgets"
  on public.ledger_budgets for update
  to authenticated
  using (user_id = auth.uid() and public.can_write_data())
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners delete ledger budgets"
  on public.ledger_budgets for delete
  to authenticated
  using (user_id = auth.uid() and public.can_write_data());

create policy "Users read ledger recurring"
  on public.ledger_recurring for select
  to authenticated
  using (user_id = public.data_owner_id());

create policy "Owners insert ledger recurring"
  on public.ledger_recurring for insert
  to authenticated
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners update ledger recurring"
  on public.ledger_recurring for update
  to authenticated
  using (user_id = auth.uid() and public.can_write_data())
  with check (user_id = auth.uid() and public.can_write_data());

create policy "Owners delete ledger recurring"
  on public.ledger_recurring for delete
  to authenticated
  using (user_id = auth.uid() and public.can_write_data());

-- -----------------------------------------------------------------------------
-- 7. 회원가입 시 profiles 행 자동 생성
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- 8. 버스 API 일일 호출 한도 (전역 집계)
-- -----------------------------------------------------------------------------
create table public.bus_api_daily_usage (
  usage_date date primary key,
  used_count integer not null default 0 check (used_count >= 0),
  updated_at timestamptz not null default now()
);

alter table public.bus_api_daily_usage enable row level security;

create or replace function public.get_bus_api_quota()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (timezone('Asia/Seoul', now()))::date;
  v_used int;
  v_limit int := 1000;
begin
  select coalesce(
    (select u.used_count from public.bus_api_daily_usage u where u.usage_date = v_date),
    0
  ) into v_used;

  return jsonb_build_object(
    'used', v_used,
    'limit', v_limit,
    'remaining', greatest(0, v_limit - v_used)
  );
end;
$$;

create or replace function public.reserve_bus_api_calls(p_count int default 1)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_date date := (timezone('Asia/Seoul', now()))::date;
  v_limit int := 1000;
  v_used int;
  v_new_used int;
begin
  if p_count < 1 then
    raise exception 'p_count must be >= 1';
  end if;

  insert into public.bus_api_daily_usage (usage_date, used_count)
  values (v_date, 0)
  on conflict (usage_date) do nothing;

  update public.bus_api_daily_usage
  set
    used_count = used_count + p_count,
    updated_at = now()
  where usage_date = v_date
    and used_count + p_count <= v_limit
  returning used_count into v_new_used;

  if v_new_used is not null then
    return jsonb_build_object(
      'allowed', true,
      'used', v_new_used,
      'limit', v_limit,
      'remaining', greatest(0, v_limit - v_new_used)
    );
  end if;

  select u.used_count into v_used
  from public.bus_api_daily_usage u
  where u.usage_date = v_date;

  return jsonb_build_object(
    'allowed', false,
    'used', coalesce(v_used, v_limit),
    'limit', v_limit,
    'remaining', greatest(0, v_limit - coalesce(v_used, v_limit))
  );
end;
$$;

revoke all on function public.get_bus_api_quota() from public;
revoke all on function public.reserve_bus_api_calls(int) from public;
grant execute on function public.get_bus_api_quota() to service_role;
grant execute on function public.reserve_bus_api_calls(int) to service_role;
