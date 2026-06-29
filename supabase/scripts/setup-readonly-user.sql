-- =============================================================================
-- 읽기 전용 계정 설정
--
-- 권장: Edge Function rotate-readonly-password?action=setup (docs/readonly-account.md)
-- 수동으로 할 경우:
--   1) Authentication → Users → Add user
--      이메일: readOnly@dashboard.local / 비밀번호: Qkdzk!YYMM (당월)
--   2) 아래 UUID 치환 후 실행
-- =============================================================================

-- 예시 (값을 반드시 교체하세요)
-- \set owner_id '00000000-0000-0000-0000-000000000001'
-- \set readonly_id '00000000-0000-0000-0000-000000000002'

update public.profiles
set
  app_role = 'readonly',
  data_owner_id = 'OWNER_USER_ID'::uuid   -- ← 본인 계정 UUID
where id = 'READONLY_USER_ID'::uuid;     -- ← 읽기 전용 계정 UUID

-- 확인
select id, email, app_role, data_owner_id
from public.profiles p
join auth.users u on u.id = p.id
where p.id in ('OWNER_USER_ID'::uuid, 'READONLY_USER_ID'::uuid);
