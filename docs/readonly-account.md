# 읽기 전용 계정

별도 로그인으로 **owner 일정·가계부를 조회만** 할 수 있는 계정입니다.  
비밀번호는 **매월 1일 00:05 (KST)** 에 규칙에 따라 자동 변경됩니다.

---

## 로그인 정보

| 항목 | 값 |
|------|-----|
| **아이디** | `readOnly` (또는 `readOnly@dashboard.local`) |
| **비밀번호 규칙** | `Qkdzk!` + `YY` + `MM` (KST 해당 월) |

로그인 화면에는 **`readOnly`만 입력**해도 됩니다. 앱이 내부적으로 `readOnly@dashboard.local`로 변환합니다.  
(Supabase Auth는 이메일 형식이 필요하지만, 사용자에게는 일반 아이디처럼 보이게 처리했습니다.)

예시:

| 월 | 비밀번호 |
|----|----------|
| 2026년 6월 | `Qkdzk!2606` |
| 2026년 7월 | `Qkdzk!2607` |
| 2026년 8월 | `Qkdzk!2608` |

Supabase Auth는 이메일 형식이 필요해서 DB에는 `readOnly@dashboard.local`로 등록됩니다.  
로그인 UI에서는 `readOnly`만 입력하면 됩니다.

---

## 1. DB 마이그레이션

SQL Editor에서 한 번 실행:

`supabase/migrations/20260702_readonly_role.sql`

---

## 2. Edge Function 시크릿

Supabase Dashboard → **Edge Functions → Secrets** 에 추가:

| Secret | 설명 |
|--------|------|
| `CRON_SECRET` | 기존 Web Push cron 과 동일 |
| `READONLY_USER_EMAIL` | `readOnly@dashboard.local` |
| `READONLY_PASSWORD_PREFIX` | `Qkdzk!` |
| `READONLY_OWNER_EMAIL` | 본인(owner) 로그인 이메일 |
| `READONLY_INITIAL_PASSWORD` | (선택) 최초 1회만 쓸 비밀번호. 없으면 당월 규칙 비밀번호 |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 자동 주입됩니다.

---

## 3. 함수 배포

```bash
npx supabase functions deploy rotate-readonly-password --project-ref pwkagsqphsfvuvbzclqy
```

---

## 4. 계정 최초 생성 (1회)

PowerShell:

```powershell
$secret = "YOUR_CRON_SECRET"
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?action=setup" `
  -Headers @{ Authorization = "Bearer $secret" }
```

`READONLY_INITIAL_PASSWORD` 를 `Qkdzk!2607` 로 두면 최초 비밀번호가 그대로 적용됩니다.

---

## 5. 매월 비밀번호 자동 변경 (cron)

상세 설정: **[docs/readonly-cron.md](./readonly-cron.md)**

**요약 (Supabase pg_cron — 권장)**

1. `supabase/migrations/20260704_readonly_password_cron.sql` 적용
2. `supabase/scripts/setup-readonly-cron.sql` 에 `CRON_SECRET` 넣고 실행 (Vault 등록)
3. 매일 15:05 UTC에 호출 → **KST 매월 1일 00:05**에만 비밀번호 변경

**대안:** [cron-job.org](https://cron-job.org) 에 POST Job 추가 (Web Push와 동일 방식)

---

## 권한 요약

| 가능 | 불가 |
|------|------|
| Home / Dashboard / Ledger 조회 | 일정·가계부 수정 |
| 일정·내역 상세 보기 | Web Push 구독 |
| 버스 조회 | 예산·고정 항목 편집 |

---

## 보안 참고

- 비밀번호 규칙이 코드·문서에 노출되므로 **개인용·가족 공유** 수준에 적합합니다.
- 규칙을 바꾸려면 `READONLY_PASSWORD_PREFIX` 시크릿과 문서를 함께 수정하세요.
- owner 계정 비밀번호와 동일하게 쓰지 마세요.
