# readOnly 비밀번호 자동 변경 Cron

매월 **1일 00:05 (KST)** 에 `Qkdzk!YYMM` 규칙으로 **readOnly + readOnly2** 비밀번호를 바꿉니다.

---

## 방식 — Supabase pg_cron (권장)

프로젝트 DB에서 **매일 15:05 UTC** (= KST 익일 00:05)에 Edge Function을 호출합니다.  
함수가 **KST 날짜가 1일일 때만** 두 계정 비밀번호를 변경합니다.

### 1. 마이그레이션 적용

```bash
npx supabase db query --linked -f supabase/migrations/20260704_readonly_password_cron.sql
npx supabase db query --linked -f supabase/migrations/20260705_fix_readonly_cron_auth.sql
```

### 2. Vault에 시크릿 등록 (1회)

`supabase/scripts/setup-readonly-cron.sql` 에서 값 교체 후 실행:

| placeholder | 값 |
|-------------|-----|
| `YOUR_CRON_SECRET` | `.env`의 `CRON_SECRET` |
| `YOUR_SUPABASE_ANON_KEY` | `.env`의 `VITE_SUPABASE_ANON_KEY` |

```bash
npx supabase db query --linked -f supabase/scripts/setup-readonly-cron.sql
```

### 3. 확인

```sql
select jobid, jobname, schedule, active from cron.job
where jobname = 'rotate-readonly-password-daily';

select name from vault.secrets where name in ('cron_secret', 'supabase_anon_key');
```

### 4. 수동 테스트

```powershell
$secret = "YOUR_CRON_SECRET"
$anon = "YOUR_VITE_SUPABASE_ANON_KEY"

# 미리보기
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?action=preview" `
  -Headers @{ Authorization = "Bearer $secret"; apikey = $anon }

# 1일이 아닐 때 — 강제 테스트
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?force=1" `
  -Headers @{ Authorization = "Bearer $secret"; apikey = $anon }
```

**1일이 아닌 날 (정상):**

```json
{
  "action": "rotate",
  "skipped": true,
  "reason": "KST 기준 매월 1일이 아닙니다. 테스트는 ?force=1"
}
```

**1일 또는 `force=1` 성공 (두 계정):**

```json
{
  "action": "rotate",
  "accounts": [
    { "label": "readOnly", "email": "readOnly@dashboard.local", "appliedPassword": "Qkdzk!2607" },
    { "label": "readOnly2", "email": "readOnly2@dashboard.local", "appliedPassword": "Qkdzk!2607" }
  ]
}
```

### pg_cron HTTP 로그

```sql
select public.invoke_rotate_readonly_password();
select id, status_code, left(content, 300), created
from net._http_response
order by created desc
limit 5;
```

---

## 401 / Unauthorized

브라우저 주소창으로 열면 **항상 401** 입니다. **POST + 헤더** 필수:

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <CRON_SECRET>` |
| `apikey` | `<VITE_SUPABASE_ANON_KEY>` |

---

## 대안 — cron-job.org (레거시)

pg_cron을 쓰는 경우 **불필요**합니다. pg_cron과 **동시에** 쓰면 하루 2번 호출되지만 1일이 아닌 날은 변경 없습니다.

| 항목 | 값 |
|------|-----|
| URL | `.../rotate-readonly-password` |
| Method | POST |
| Schedule | 매일 15:05 UTC |
| Headers | `Authorization`, `apikey` |

---

## 스케줄 설명

| UTC | KST (익일) | 동작 |
|-----|------------|------|
| 매일 15:05 | 00:05 | 함수 호출 |
| — | **1일** 00:05 | readOnly + readOnly2 비밀번호 변경 |
| — | 2일~말일 | `skipped: true` |

---

## 관련 파일

| 경로 | 역할 |
|------|------|
| `supabase/functions/rotate-readonly-password/` | setup / setup2 / setup-all / rotate |
| `supabase/migrations/20260704`–`20260705` | pg_cron + Vault 호출 |
| `supabase/scripts/setup-readonly-cron.sql` | Vault 1회 등록 |
| [readonly-account.md](./readonly-account.md) | 계정별 권한 |
