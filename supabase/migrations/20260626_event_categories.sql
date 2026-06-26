-- 카테고리 색상/이름 변경 + 공부 → 취업 반영 (SQL Editor에서 실행)

update public.events set category = 'career' where category in ('study', 'project');

alter table public.events drop constraint if exists events_category_check;

alter table public.events
  add constraint events_category_check check (
    category in ('personal', 'company', 'finance', 'subscription', 'career', 'family', 'church')
  );
