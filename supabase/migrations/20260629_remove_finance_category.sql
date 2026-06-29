-- 금융 카테고리 제거 → 기존 일정은 개인으로 이전 (SQL Editor에서 실행)

update public.events set category = 'personal' where category = 'finance';

alter table public.events drop constraint if exists events_category_check;

alter table public.events
  add constraint events_category_check check (
    category in ('personal', 'company', 'subscription', 'career', 'family', 'church')
  );
