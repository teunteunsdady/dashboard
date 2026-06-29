-- 일정 알림: 시작 10분 전 (종일은 09:00 KST 기준 10분 전)

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
      (
        (date_trunc('day', p_starts_at at time zone p_tz) + interval '9 hours' - interval '10 minutes')
        at time zone p_tz
      )
    else
      p_starts_at - interval '10 minutes'
  end;
$$;
