# 장애 대응 런북

증상이 생겼을 때 **어디를 먼저 볼지** 정리한 문서입니다.

---

## 1. 먼저 확인할 곳 (공통)

| 순서 | 확인 | 링크/위치 |
|------|------|-----------|
| 1 | 배포 사이트 살아 있는지 | https://dashboard-zeta-sable-71.vercel.app |
| 2 | Vercel 최근 배포 성공 여부 | Vercel Dashboard → Deployments |
| 3 | Supabase 상태 | https://supabase.com/dashboard/project/pwkagsqphsfvuvbzclqy |
| 4 | 브라우저 콘솔 (F12) | Network / Console 탭 |

### Vercel 환경 변수 체크리스트

| 변수 | 없으면 발생하는 증상 |
|------|---------------------|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | 로그인·일정·가계부 전부 실패 |
| `VITE_VAPID_PUBLIC_KEY` | Web Push 구독 불가 |
| `SEOUL_BUS_API_KEY` | 버스 503 |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | 버스 한도 전역 집계 안 됨 |

### Supabase Edge Function Secrets

Dashboard → **Edge Functions → Secrets**

`CRON_SECRET`, `VAPID_*`, `READONLY_*` 가 Edge Function과 `.env` / Vault와 **일치**해야 합니다.

---

## 2. 증상별 대응

### 로그인이 안 됨

| 증상 | 확인 | 조치 |
|------|------|------|
| owner 이메일 로그인 실패 | Supabase → Authentication → Users | 비밀번호 재설정 |
| `readOnly` 로그인 실패 | 아이디 `readOnly` | 당월 비밀번호 `Qkdzk!YYMM` 확인 |
| 1일 이후 readOnly 갑자기 실패 | 자동 비밀번호 변경 | [readonly-cron.md](./readonly-cron.md) |
| Supabase 미연동 메시지 | Vercel `VITE_SUPABASE_*` | 값 확인 후 재배포 |

```sql
select p.id, u.email, p.app_role, p.data_owner_id
from public.profiles p
join auth.users u on u.id = p.id;
```

---

### 일정이 안 보이거나 저장이 안 됨

| 확인 | 위치 |
|------|------|
| RLS / owner 연결 | `profiles.data_owner_id` (readOnly) |
| 네트워크 403/401 | 브라우저 Network → `events` |
| readOnly에서 수정 | 정상 — RLS 차단 |

```sql
select id, title, starts_at, user_id from public.events
order by starts_at desc limit 10;
```

---

### Web Push 알림이 안 옴

상세: [web-push.md](./web-push.md) · [web-push-test-scenarios.md](./web-push-test-scenarios.md)

| 순서 | 확인 | 정상 |
|------|------|------|
| 1 | Dashboard 백그라운드 알림 구독 | `push_subscriptions`에 행 |
| 2 | 일정 notify 켜짐 | `notify_enabled = true` |
| 3 | cron-job.org | 5분마다 200 |
| 4 | Edge Function 로그 | `send-event-reminders` |
| 5 | iOS | 홈 화면 추가 후 실행 |

```powershell
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/send-event-reminders" `
  -Headers @{ Authorization = "Bearer YOUR_CRON_SECRET" }
```

| 응답 | 의미 |
|------|------|
| `401` | `CRON_SECRET` 불일치 |
| `due: 0` | 알림 시각 전 (정상) |
| `due: 1, sent: 0` | 구독 없음 / Push 실패 |

```sql
select * from public.push_subscriptions;
select * from public.event_push_dispatches order by sent_at desc limit 10;
```

**로그:** Supabase → Edge Functions → `send-event-reminders` → Logs

---

### readOnly 비밀번호가 바뀌지 않음

상세: [readonly-cron.md](./readonly-cron.md)

| 확인 | SQL / 위치 |
|------|------------|
| pg_cron Job | `select jobname, schedule, active from cron.job;` |
| Vault | `select name from vault.secrets where name in ('cron_secret','supabase_anon_key');` |
| HTTP 결과 | `select status_code, left(content,200), error_msg from net._http_response order by id desc limit 5;` |
| EF 로그 | `rotate-readonly-password` → Logs |

```powershell
Invoke-RestMethod -Method POST `
  -Uri ".../rotate-readonly-password?action=preview" `
  -Headers @{ Authorization = "Bearer $secret"; apikey = $anon }
```

| 응답 | 의미 |
|------|------|
| `401` + authentication required | POST + Bearer + apikey 필요 |
| `skipped: true` | KST 1일 아님 (정상) |
| `appliedPassword` | 변경 성공 |

```sql
select public.invoke_rotate_readonly_password();
select status_code, content from net._http_response order by id desc limit 1;
```

---

### 버스 정보가 안 나옴 / 한도 초과

| 증상 | 조치 |
|------|------|
| `SEOUL_BUS_API_KEY` 오류 | Vercel env · 재배포 |
| 한도 초과 | 자정(KST)까지 대기 |
| 한도가 사람마다 다름 | `SUPABASE_SERVICE_ROLE_KEY` Vercel 등록 |

```sql
select * from public.get_bus_api_quota();
select usage_date, used_count from public.bus_api_daily_usage
order by usage_date desc limit 7;
```

**로그:** Vercel → Logs → `/api/bus/arrivals`

새로고침은 캐시(~86초) 유효 시 서울시 API를 호출하지 않습니다.

### 버스 도착 알림이 안 옴

| 확인 | 조치 |
|------|------|
| Bus → 도착 알림 켜짐 | 토글 + 알림 권한 허용 |
| 오늘이 알림 요일·시간인지 | 기본 수·일, 7–10 / 17–21 |
| 탭이 열려 있는지 | 백그라운드·잠금 화면에서는 미동작 |
| API 한도 | `get_bus_api_quota()` — 남은 횟수 0이면 조회 실패 |

설정은 `localStorage` (`cyanorbit-yol-bus-alarm`)에 저장됩니다.

---

### 가계부(Ledger) 오류

- 로그인 필요
- readOnly는 조회만

---

### Service Worker / PWA

| 증상 | 조치 |
|------|------|
| Push 구독 실패 | `vercel.json` — `sw.js` rewrite 제외 |
| 구버전 SW | 사이트 데이터 삭제 / 강력 새로고침 |
| iOS | [ios-bus-guide.md](./ios-bus-guide.md) |

---

## 3. 로그 위치 요약

| 영역 | 위치 |
|------|------|
| 프론트 오류 | 브라우저 DevTools Console |
| API 요청 | DevTools Network |
| Vercel 서버 | Vercel Dashboard → Logs |
| Edge Function | Supabase → Edge Functions → Logs |
| DB / RLS | Supabase → SQL Editor |
| Web Push cron | cron-job.org → Job History |
| readOnly cron | `cron.job`, `net._http_response` |
| Auth | Supabase → Authentication |

---

## 4. 자주 쓰는 복구

**CRON_SECRET 변경 후:** Supabase Secrets → Vault (`setup-readonly-cron.sql`) → cron-job.org 헤더

**readOnly 재연결:** `?action=setup` 또는 `setup-readonly-user.sql`

**마이그레이션:**

```bash
npx supabase db query --linked -f supabase/migrations/파일명.sql
```

**Edge Function 재배포:**

```bash
npx supabase functions deploy send-event-reminders --project-ref pwkagsqphsfvuvbzclqy --no-verify-jwt
npx supabase functions deploy rotate-readonly-password --project-ref pwkagsqphsfvuvbzclqy --no-verify-jwt
```

---

## 5. 외부 상태 페이지

| 서비스 | URL |
|--------|-----|
| Vercel | https://www.vercel-status.com |
| Supabase | https://status.supabase.com |

---

## 6. 관련 문서

- [docs/README.md](./README.md)
- [features-overview.md](./features-overview.md)
- [web-push.md](./web-push.md)
- [readonly-account.md](./readonly-account.md)
- [readonly-cron.md](./readonly-cron.md)
