-- 읽기 전용 계정: profiles 역할 + 공유 데이터 owner 연결

alter table public.profiles
  add column if not exists app_role text not null default 'owner'
    check (app_role in ('owner', 'readonly'));

alter table public.profiles
  add column if not exists data_owner_id uuid references auth.users (id) on delete cascade;

alter table public.profiles
  drop constraint if exists profiles_readonly_owner_check;

alter table public.profiles
  add constraint profiles_readonly_owner_check check (
    (app_role = 'owner' and data_owner_id is null)
    or (app_role = 'readonly' and data_owner_id is not null)
  );

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

-- profiles
drop policy if exists "Users update own profile" on public.profiles;

create policy "Owners update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id and public.can_write_data())
  with check (auth.uid() = id and public.can_write_data());

-- events
drop policy if exists "Users manage own events" on public.events;

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

-- ledger
drop policy if exists "Users manage own ledger entries" on public.ledger_entries;
drop policy if exists "Users manage own ledger budgets" on public.ledger_budgets;
drop policy if exists "Users manage own ledger recurring" on public.ledger_recurring;

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

-- push (읽기 전용은 구독 불가)
drop policy if exists "Users manage own push subscriptions" on public.push_subscriptions;

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
