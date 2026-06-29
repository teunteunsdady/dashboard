-- =============================================================================
-- Personal Dashboard — Supabase Schema (v2)
-- Supabase 대시보드 → SQL Editor 에서 전체 실행
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 0. 기존 스키마 정리 (재설계 시)
-- 테이블 DROP CASCADE 시 연결된 트리거도 함께 삭제됩니다.
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;

drop table if exists public.ledger_entries cascade;
drop table if exists public.ledger_budgets cascade;
drop table if exists public.ledger_recurring cascade;
drop table if exists public.events cascade;
drop table if exists public.projects cascade;
drop table if exists public.skills cascade;
drop table if exists public.profiles cascade;

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
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
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

create policy "Users update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

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

create policy "Users manage own events"
  on public.events for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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

create policy "Users manage own ledger entries"
  on public.ledger_entries for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own ledger budgets"
  on public.ledger_budgets for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage own ledger recurring"
  on public.ledger_recurring for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

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
