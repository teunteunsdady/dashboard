-- Ledger (가계부) 테이블 — Supabase SQL Editor에서 실행
-- events 마이그레이션 이후 실행. set_updated_at() 함수가 이미 있어야 합니다.

-- 1) 고정 수입·지출
create table if not exists public.ledger_recurring (
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

create index if not exists ledger_recurring_user_id_idx on public.ledger_recurring (user_id);

-- 2) 수입·지출 내역
create table if not exists public.ledger_entries (
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

create index if not exists ledger_entries_user_id_idx on public.ledger_entries (user_id);
create index if not exists ledger_entries_occurred_on_idx on public.ledger_entries (occurred_on);

-- 3) 월별 예산
create table if not exists public.ledger_budgets (
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

create index if not exists ledger_budgets_user_month_idx on public.ledger_budgets (user_id, month);

-- updated_at 트리거
drop trigger if exists ledger_entries_updated_at on public.ledger_entries;
create trigger ledger_entries_updated_at
  before update on public.ledger_entries
  for each row execute function public.set_updated_at();

drop trigger if exists ledger_budgets_updated_at on public.ledger_budgets;
create trigger ledger_budgets_updated_at
  before update on public.ledger_budgets
  for each row execute function public.set_updated_at();

drop trigger if exists ledger_recurring_updated_at on public.ledger_recurring;
create trigger ledger_recurring_updated_at
  before update on public.ledger_recurring
  for each row execute function public.set_updated_at();

-- RLS
alter table public.ledger_entries enable row level security;
alter table public.ledger_budgets enable row level security;
alter table public.ledger_recurring enable row level security;

drop policy if exists "Users manage own ledger entries" on public.ledger_entries;
create policy "Users manage own ledger entries"
  on public.ledger_entries for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own ledger budgets" on public.ledger_budgets;
create policy "Users manage own ledger budgets"
  on public.ledger_budgets for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own ledger recurring" on public.ledger_recurring;
create policy "Users manage own ledger recurring"
  on public.ledger_recurring for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
