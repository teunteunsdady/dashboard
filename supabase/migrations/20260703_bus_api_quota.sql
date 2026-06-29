-- 서울시 버스 API 일일 호출 한도 (1000회) — 전역 집계

create table if not exists public.bus_api_daily_usage (
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
