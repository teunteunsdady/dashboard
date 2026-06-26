-- 회사 일정 카테고리 추가 (SQL Editor에서 실행)

alter table public.events drop constraint if exists events_category_check;

alter table public.events
  add constraint events_category_check check (
    category in (
      'personal', 'company', 'finance', 'subscription', 'career', 'family', 'church'
    )
  );
