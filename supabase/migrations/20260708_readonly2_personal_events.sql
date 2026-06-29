-- readOnly2: 개인 일정(category=personal)만 조회

alter table public.profiles
  add column if not exists readonly_scope text
    check (readonly_scope is null or readonly_scope in ('full', 'personal_events'));

update public.profiles
set readonly_scope = 'full'
where app_role = 'readonly' and readonly_scope is null;

alter table public.profiles
  drop constraint if exists profiles_readonly_owner_check;

alter table public.profiles
  add constraint profiles_readonly_owner_check check (
    (app_role = 'owner' and data_owner_id is null and readonly_scope is null)
    or (
      app_role = 'readonly'
      and data_owner_id is not null
      and readonly_scope in ('full', 'personal_events')
    )
  );

create or replace function public.readonly_scope()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.readonly_scope
  from public.profiles p
  where p.id = auth.uid() and p.app_role = 'readonly';
$$;

create or replace function public.readonly_has_full_data_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
  (
    select p.readonly_scope = 'full'
    from public.profiles p
    where p.id = auth.uid() and p.app_role = 'readonly'
  ),
  true
  );
$$;

create or replace function public.can_read_event_category(p_category text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.readonly_has_full_data_access() or p_category = 'personal';
$$;

-- events: 개인 일정 전용 계정은 personal만
drop policy if exists "Users read events" on public.events;

create policy "Users read events"
  on public.events for select
  to authenticated
  using (
    user_id = public.data_owner_id()
    and public.can_read_event_category(category)
  );

-- ledger: 전체 읽기 전용만
drop policy if exists "Users read ledger entries" on public.ledger_entries;
drop policy if exists "Users read ledger budgets" on public.ledger_budgets;
drop policy if exists "Users read ledger recurring" on public.ledger_recurring;

create policy "Users read ledger entries"
  on public.ledger_entries for select
  to authenticated
  using (
    user_id = public.data_owner_id()
    and public.readonly_has_full_data_access()
  );

create policy "Users read ledger budgets"
  on public.ledger_budgets for select
  to authenticated
  using (
    user_id = public.data_owner_id()
    and public.readonly_has_full_data_access()
  );

create policy "Users read ledger recurring"
  on public.ledger_recurring for select
  to authenticated
  using (
    user_id = public.data_owner_id()
    and public.readonly_has_full_data_access()
  );
