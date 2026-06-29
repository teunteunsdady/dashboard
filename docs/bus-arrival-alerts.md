# 버스 도착 알림 (Web Push)

Bus 페이지에서 **도착 임박 시** 탭이 꺼져 있어도 OS 알림을 받는 기능입니다.  
일정 Web Push와 동일한 `push_subscriptions`·Service Worker를 사용합니다.

---

## 개요

| 방식 | 탭 열림 | 탭 닫힘 |
|------|---------|---------|
| `BusAlarmWatcher` (폴백) | ✅ (~1분) | ❌ |
| **Web Push + 서버 cron (본 문서)** | ✅ | ✅ (~5분) |

Push 구독이 있으면 서버가 발송하고, 클라이언트 폴백은 건너뜁니다.

---

## 동작 흐름

```
Bus → 도착 알림 ON + Web Push 구독
  → bus_alarm_settings (Supabase DB)

pg_cron 5분마다 → send-bus-arrival-reminders (Edge Function)
  → 요일·시간대·정류장 확인 (KST)
  → bus_arrival_cache / 서울시 API (전역 한도 공유)
  → N분 이내 도착 시 Web Push
  → bus_alarm_state (중복 발송 방지)
```

**기본 설정:** 수·일, 7–10시 / 17–21시, 5분 이내, 출퇴근 정류장 자동

---

## DB

| 테이블 | 역할 |
|--------|------|
| `bus_alarm_settings` | 사용자별 알림 설정 |
| `bus_alarm_state` | 정류장별 재알림 armed 상태 |
| `bus_arrival_cache` | Edge Function 간 API 캐시 (~86초) |

마이그레이션: `supabase/migrations/20260706_bus_alarm_push.sql`

---

## Edge Function

| 항목 | 값 |
|------|-----|
| 함수 | `send-bus-arrival-reminders` |
| URL | `https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/send-bus-arrival-reminders` |
| 인증 | `Authorization: Bearer <CRON_SECRET>` (+ `apikey` 권장) |

**Supabase Secrets (추가):** `SEOUL_BUS_API_KEY` (Vercel과 동일)

```bash
npx supabase functions deploy send-bus-arrival-reminders --project-ref pwkagsqphsfvuvbzclqy
```

### 수동 호출 (테스트)

```powershell
$secret = "YOUR_CRON_SECRET"
$anon = "YOUR_VITE_SUPABASE_ANON_KEY"
Invoke-RestMethod -Method POST `
  -Uri "https://pwkagsqphsfvuvbzclqy.supabase.co/functions/v1/send-bus-arrival-reminders" `
  -Headers @{ Authorization = "Bearer $secret"; apikey = $anon }
```

**정상 응답 예:**

```json
{"enabled":1,"active":0,"stopsChecked":0,"sent":0,"failed":0,"rearmed":0,"cleaned":0}
```

| 필드 | 의미 |
|------|------|
| `enabled` | DB에 켜진 설정 수 |
| `active` | 지금 요일·시간대에 감시 중인 사용자 수 |
| `sent` | 이번 호출에서 발송한 Push 수 |

---

## Cron

일정 알림과 **같은 pg_cron Job**에서 호출됩니다 (`send-push-reminders-5min`).

```sql
select jobname, schedule, active from cron.job
where jobname = 'send-push-reminders-5min';
```

마이그레이션: `supabase/migrations/20260707_push_reminders_cron.sql`

> **cron-job.org는 사용하지 않습니다.** 과거 Job이 남아 있으면 일정 알림이 중복될 수 있으니 비활성화하세요.

---

## 앱에서 켜는 방법

1. Dashboard에서 **백그라운드 알림(Web Push)** 구독
2. Bus 페이지 → **도착 알림** ON
3. 알림 권한 허용
4. 설정이 `bus_alarm_settings`에 저장됨

readOnly 계정은 Push 구독·버스 알림 설정이 불가합니다 (owner만).

---

## API 한도

서울시 API **1일 1,000회**는 Vercel `/api/bus`와 Edge Function이 **공유**합니다.  
5분 주기 + 캐시로 하루 수십~百 회 수준(정류장 1~2곳)이 일반적입니다.

```sql
select * from public.get_bus_api_quota();
```

---

## 관련 문서

- [web-push.md](./web-push.md) — Push 구독·VAPID
- [runbook.md](./runbook.md) — 증상별 대응
- [ios-bus-guide.md](./ios-bus-guide.md) — iOS PWA
