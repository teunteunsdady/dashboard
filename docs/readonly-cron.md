# readOnly 비밀번호 자동 변경 Cron

매월 **1일 00:05 (KST)** 에 `Qkdzk!YYMM` 규칙으로 readOnly 계정 비밀번호를 바꿉니다.

---

## 방식 A — Supabase pg_cron (권장, 레포에 포함)

프로젝트 DB에서 **매일 15:05 UTC** (= KST 익일 00:05)에 Edge Function을 호출합니다.  
함수가 **KST 날짜가 1일일 때만** 실제로 비밀번호를 변경합니다.

### 1. 마이그레이션 적용

```bash
npx supabase db query --linked -f supabase/migrations/20260704_readonly_password_cron.sql
```

### 2. Vault에 시크릿 등록 (1회)

`supabase/scripts/setup-readonly-cron.sql` 에서 아래 두 값을 바꾼 뒤 실행:

| placeholder | 값 |
|-------------|-----|
| `YOUR_CRON_SECRET` | `.env`의 `CRON_SECRET` |
| `YOUR_SUPABASE_ANON_KEY` | `.env`의 `VITE_SUPABASE_ANON_KEY` |

```bash
npx supabase db query --linked -f supabase/scripts/setup-readonly-cron.sql
```

### cron-job.org에서 401 / Unauthorized 가 나올 때

브라우저 주소창으로 URL을 열면 **항상 401** 입니다. 반드시 **POST + 헤더** 로 호출해야 합니다.

| Header | Value |
|--------|-------|
| `Authorization` | `Bearer <CRON_SECRET>` |
| `apikey` | `<VITE_SUPABASE_ANON_KEY>` (publishable key) |

cron-job.org 설정:

1. **URL** — `https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password`
2. **Request method** — `POST`
3. **Headers** (Advanced):
   - `Authorization` = `Bearer ` + `.env`의 `CRON_SECRET` (공백 포함, Bearer 뒤 한 칸)
   - `apikey` = `.env`의 `VITE_SUPABASE_ANON_KEY`
4. **Run now** 로 테스트

정상 (오늘이 1일이 아닐 때):

```json
{"action":"rotate","skipped":true,"reason":"KST 기준 매월 1일이 아닙니다..."}
```

PowerShell 테스트:

```powershell
$secret = "YOUR_CRON_SECRET"
$anon = "YOUR_VITE_SUPABASE_ANON_KEY"
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password" `
  -Headers @{
    Authorization = "Bearer $secret"
    apikey = $anon
  }
```

### 3. 확인

```sql
-- cron 작업
select jobid, jobname, schedule, active from cron.job;

-- Vault (값은 표시되지 않음)
select name, description from vault.secrets where name = 'cron_secret';
```

### 4. 수동 테스트

PowerShell (`.env`의 CRON_SECRET 사용):

```powershell
$secret = "YOUR_CRON_SECRET"

# 미리보기 (비밀번호 변경 없음)
Invoke-RestMethod -Method GET `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?action=preview" `
  -Headers @{ Authorization = "Bearer $secret" }

# 오늘이 1일이 아니면 skipped — 강제 테스트
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password?force=1" `
  -Headers @{ Authorization = "Bearer $secret" }
```

**1일이 아닌 날 정상 응답 (변경 없음):**

```json
{
  "action": "rotate",
  "skipped": true,
  "reason": "KST 기준 매월 1일이 아닙니다. 테스트는 ?force=1",
  "passwordForCurrentMonth": "Qkdzk!2606"
}
```

**매월 1일 00:05 KST 이후 성공 응답:**

```json
{
  "action": "rotate",
  "appliedPassword": "Qkdzk!2607",
  "forced": false
}
```

### pg_cron HTTP 로그

```sql
select id, status_code, created
from net._http_response
order by created desc
limit 10;
```

---

## 방식 B — cron-job.org (Web Push와 동일)

이미 [cron-job.org](https://cron-job.org) 계정이 있으면 새 Job을 추가합니다.

| 항목 | 값 |
|------|-----|
| Title | `rotate-readonly-password` |
| URL | `https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/rotate-readonly-password` |
| Method | `POST` |
| Schedule | Every day at **15:05** (UTC) |
| Headers | `Authorization: Bearer <CRON_SECRET>` |

**Run now** 로 테스트 → 1일이 아니면 `skipped: true` 가 정상입니다.

pg_cron(A)과 cron-job.org(B)를 **동시에** 쓰면 하루 2번 호출되지만, 1일이 아닌 날은 변경 없고 1일에도 같은 비밀번호로 두 번 바꿔도 결과는 동일합니다. 하나만 쓰는 것을 권장합니다.

---

## 스케줄 설명

| UTC | KST (익일) | 동작 |
|-----|------------|------|
| 매일 15:05 | 00:05 | 함수 호출 |
| — | **1일** 00:05 | 비밀번호 `Qkdzk!YYMM` 적용 |
| — | 2일~말일 00:05 | `skipped: true` (변경 없음) |

---

## 관련 파일

| 경로 | 역할 |
|------|------|
| `supabase/functions/rotate-readonly-password/` | 비밀번호 계산·변경 |
| `supabase/migrations/20260704_readonly_password_cron.sql` | pg_cron 등록 |
| `supabase/scripts/setup-readonly-cron.sql` | Vault 시크릿 1회 등록 |
| `docs/readonly-account.md` | readOnly 계정 전체 안내 |
