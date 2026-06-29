# 읽기 전용 계정

별도 로그인으로 owner 데이터를 **조회만** 할 수 있는 계정입니다.  
비밀번호는 **매월 1일 00:05 (KST)** 에 규칙에 따라 **두 계정 모두** 자동 변경됩니다.

---

## 계정 종류

| 아이디 | 이메일 | 범위 |
|--------|--------|------|
| **readOnly** | `readOnly@dashboard.local` | 일정·가계부·버스 등 **전체 데이터** |
| **readOnly2** | `readOnly2@dashboard.local` | **개인 카테고리 일정만** (`category = personal`) |

로그인 화면에는 **`readOnly` / `readOnly2`만 입력**해도 됩니다.

---

## 비밀번호

| 항목 | 값 |
|------|-----|
| **규칙** | `Qkdzk!` + `YY` + `MM` (KST 해당 월) |
| **두 계정 동일** | readOnly, readOnly2 같은 비밀번호 |

예시:

| 월 | 비밀번호 |
|----|----------|
| 2026년 6월 | `Qkdzk!2606` |
| 2026년 7월 | `Qkdzk!2607` |

---

## readOnly (전체)

| 가능 | 불가 |
|------|------|
| Home / Dashboard / Ledger / Bus 조회 | 일정·가계부 수정 |
| 모든 카테고리 일정·카테고리 태그 표시 | Web Push 구독 |
| 가계부·버스 요약 | 예산·고정 항목 편집 |

DB: `profiles.app_role = 'readonly'`, `readonly_scope = 'full'`

---

## readOnly2 (개인 일정만)

| 가능 | 불가 |
|------|------|
| Home / Dashboard — **개인 일정만** | 회사·가족·교회 등 다른 카테고리 일정 |
| 일정 상세 보기 (읽기) | Ledger, Bus 메뉴·페이지 |
| | 카테고리 필터·태그·툴팁 (UI에서 숨김) |
| | 일정 수정, Web Push |

DB: `profiles.app_role = 'readonly'`, `readonly_scope = 'personal_events'`  
RLS: `events`에서 `category = 'personal'`만 SELECT

---

## 1. DB 마이그레이션

SQL Editor 또는 CLI:

1. `supabase/migrations/20260702_readonly_role.sql`
2. `supabase/migrations/20260708_readonly2_personal_events.sql`

---

## 2. Edge Function 시크릿

Supabase Dashboard → **Edge Functions → Secrets**

| Secret | 설명 |
|--------|------|
| `CRON_SECRET` | pg_cron · Edge Function 인증 |
| `READONLY_USER_EMAIL` | `readOnly@dashboard.local` |
| `READONLY2_USER_EMAIL` | (선택) `readOnly2@dashboard.local` |
| `READONLY_PASSWORD_PREFIX` | `Qkdzk!` |
| `READONLY_OWNER_EMAIL` | 본인(owner) 로그인 이메일 |
| `READONLY_INITIAL_PASSWORD` | (선택) 최초 1회 setup 비밀번호 |

---

## 3. 함수 배포

```bash
npx supabase functions deploy rotate-readonly-password --project-ref pwkagsqphsfvuvbzclqy
```

---

## 4. 계정 최초 생성 (1회)

**readOnly (전체):**

```powershell
$secret = "YOUR_CRON_SECRET"
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?action=setup" `
  -Headers @{ Authorization = "Bearer $secret" }
```

**readOnly2 (개인 일정):**

```powershell
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?action=setup2" `
  -Headers @{ Authorization = "Bearer $secret" }
```

**둘 다 한 번에:**

```powershell
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?action=setup-all" `
  -Headers @{ Authorization = "Bearer $secret" }
```

---

## 5. 매월 비밀번호 자동 변경

상세: **[readonly-cron.md](./readonly-cron.md)**

- Supabase **pg_cron** `rotate-readonly-password-daily`
- 매일 15:05 UTC 호출 → **KST 1일 00:05**에 readOnly + readOnly2 동시 변경

---

## 확인 SQL

```sql
select u.email, p.app_role, p.readonly_scope, p.data_owner_id
from public.profiles p
join auth.users u on u.id = p.id
where p.app_role = 'readonly'
order by u.email;
```

---

## 보안 참고

- 비밀번호 규칙이 문서에 노출되므로 **개인용·가족 공유** 수준에 적합합니다.
- owner 비밀번호와 동일하게 쓰지 마세요.
