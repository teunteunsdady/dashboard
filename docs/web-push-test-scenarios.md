# Web Push 테스트 시나리오

Dashboard 백그라운드 일정 알림(Web Push)이 **끝까지** 동작하는지 확인하기 위한 체크리스트입니다.

**관련 문서:** [web-push.md](./web-push.md) (설정·구조)

**배포 URL:** https://dashboard-zeta-sable-71.vercel.app/dashboard

---

## 테스트 전 준비

아래가 모두 완료되어 있어야 합니다.

| # | 항목 | 확인 방법 |
|---|------|-----------|
| 1 | DB 마이그레이션 | `20260630_event_notify.sql`, `20260701_web_push.sql` 실행 |
| 2 | Edge Function 배포 | Supabase → Edge Functions → `send-event-reminders` 존재 |
| 3 | Supabase Secrets | `VAPID_*`, `CRON_SECRET` 등록 |
| 4 | Cron (5분) | cron-job.org 등에서 POST 호출 설정, Run now 성공 |
| 5 | Vercel 환경 변수 | `VITE_VAPID_PUBLIC_KEY` 등록 후 Redeploy |
| 6 | 로그인 | Dashboard는 Supabase 로그인 필요 |

**Cron 수동 호출 성공 예시 (HTTP 200):**

```json
{"checked":1,"due":0,"sent":0,"failed":0,"cleaned":0}
```

---

## 시나리오 0 — 사전 점검 (약 2분)

**목적:** 배포·환경 변수·UI 노출 확인

### 절차

1. https://dashboard-zeta-sable-71.vercel.app/dashboard 접속 후 로그인
2. 알림이 켜진 일정이 하나 이상 있는지 확인 (`notify` ON)
3. 상단 배너 확인

### 기대 결과

| 결과 | 의미 |
|------|------|
| **「백그라운드 알림 켜기」** 배너 표시 | VAPID·Supabase 연동 정상 |
| **「백그라운드 알림이 켜져 있습니다」** (초록) | 이미 Push 구독됨 |
| 배너 없음 + 알림 일정 있음 | `VITE_VAPID_PUBLIC_KEY` 미설정 또는 미배포 |
| `탭이 열려 있을 때만 알림` 안내 문구 | VAPID 키 없음 — Vercel 환경 변수 확인 |

### 체크

- [ ] Dashboard 접속·로그인 성공
- [ ] 알림 관련 배너가 의도한 상태로 표시됨

---

## 시나리오 1 — Push 구독 등록 (약 2분)

**목적:** 브라우저 구독 → Supabase `push_subscriptions` 저장 확인

### 절차

1. Dashboard에서 **「백그라운드 알림 켜기」** 클릭
2. 브라우저 **알림 허용** 선택
3. 배너가 초록색 **「백그라운드 알림이 켜져 있습니다」** 로 변경되는지 확인
4. Supabase Dashboard → **Table Editor** → `push_subscriptions` 테이블 확인

### 기대 결과

| 항목 | 기대 |
|------|------|
| UI | 초록 배너 + 「백그라운드 알림 끄기」 버튼 |
| DB | 본인 `user_id`로 행 1건 (`endpoint`, `p256dh`, `auth_key` 존재) |

### 실패 시

| 증상 | 조치 |
|------|------|
| 알림 권한 거부 | 주소창 자물쇠 → 사이트 설정 → 알림 허용 |
| Push 구독 테이블 오류 | `20260701_web_push.sql` 실행 |
| Service Worker 오류 | HTTPS 배포 URL에서 테스트 (localhost도 가능) |

### 체크

- [ ] 알림 권한 허용
- [ ] 초록 배너 표시
- [ ] `push_subscriptions`에 행 생성

---

## 시나리오 2 — 탭 열린 상태 알림 (약 5분)

**목적:** 일정 알림 시각·클라이언트/SW 알림 경로 확인 (가장 단순)

### 일정 설정

| 필드 | 값 |
|------|-----|
| 제목 | `테스트-탭열림` |
| 알림 | **ON** |
| 종일 | **OFF** (시간 일정) |
| 시작 | **현재 시각 + 2~3분** |

### 절차

1. 위 일정 저장
2. **Dashboard 탭을 열어 둔 채** 대기
3. 시작 시각에 OS 알림 수신 확인
4. 알림 클릭 시 Dashboard 포커스 확인

### 기대 결과

- 시작 시각(±수 초)에 알림 1회
- 제목: `테스트-탭열림`
- 중복 알림 없음 (Web Push 구독 중이면 SW 경유 1회)

### 체크

- [ ] 예정 시각에 알림 수신
- [ ] 클릭 시 사이트로 복귀

---

## 시나리오 3 — 탭 닫힌 상태 알림 ★ 핵심 (약 10분)

**목적:** Web Push + Cron + Edge Function **전체 파이프라인** 검증

### 일정 설정

| 필드 | 값 |
|------|-----|
| 제목 | `테스트-탭닫힘` |
| 알림 | **ON** |
| 종일 | **OFF** |
| 시작 | **현재 시각 + 4분** 권장 |

> Cron이 5분마다 돌므로, 시작 시각은 **지금+3~5분**이 적당합니다.  
> 시작 직후 최대 **5분**까지 추가 대기할 수 있습니다.

### 절차

1. 시나리오 1 완료 (백그라운드 알림 켜짐)
2. 위 일정 저장
3. **Dashboard 탭을 완전히 닫기** (다른 앱/탭만 사용)
4. 시작 시각 + 최대 5분 대기
5. OS 알림 수신 확인
6. 알림 탭 → Dashboard 열림 확인

### 기대 결과

| 시점 | 기대 |
|------|------|
| 시작 시각 ~ +5분 | OS 알림 1회 |
| Supabase Logs | `due: 1`, `sent: 1` (해당 시각 cron 실행 시) |
| `event_push_dispatches` | 해당 `event_id` + `notify_at` 행 추가 (service role로만 확인) |

### 실패 시

| 증상 | 의심 원인 |
|------|-----------|
| 탭 열릴 때만 옴 | Push 미구독, `push_subscriptions` 비어 있음 |
| 10분 넘어도 없음 | Cron 미동작, 알림 시각이 5분 창 밖, `notify` OFF |
| cron 200인데 `sent: 0` | 구독 없음 또는 `due: 0` (시각 아직 안 됨) |

### 체크

- [ ] 탭 닫은 상태에서 알림 수신
- [ ] (선택) Edge Function Logs에서 `sent ≥ 1` 확인

---

## 시나리오 4 — 종일 일정 09:00 알림

**목적:** 종일 일정 알림 시각(한국 09:00) 검증

### 일정 설정

| 필드 | 값 |
|------|-----|
| 제목 | `테스트-종일` |
| 알림 | **ON** |
| 종일 | **ON** |
| 날짜 | **오늘** (09:00 이전이면 오늘, 이후면 내일) |

### 절차

1. 일정 저장
2. 백그라운드 알림 켜진 상태 유지
3. **당일 09:00 (KST)** 전후로 대기 (탭 닫아도 됨)
4. 09:00~09:05 사이 알림 확인

### 기대 결과

- 한국 시간 **오전 9시** 전후 알림
- 본문에 종일 일정 안내 문구

### 체크

- [ ] 09:00 전후 알림 수신 (또는 내일로 예약 후 재확인)

---

## 시나리오 5 — Cron · Edge Function 로그 확인

**목적:** 서버 측 발송 로직만 따로 검증

### 절차

1. 알림 ON + **시작 시각이 최근 5분 이내**인 일정 준비 (시나리오 3 직후가 좋음)
2. cron-job.org에서 **Run now** 실행
3. Supabase → Edge Functions → `send-event-reminders` → **Logs** 확인

### 응답 필드 해석

```json
{"checked":2,"due":1,"sent":1,"failed":0,"cleaned":0}
```

| 필드 | 의미 |
|------|------|
| `checked` | `notify_enabled=true` 일정 수 |
| `due` | 최근 5분 창에 들어온 발송 대상 |
| `sent` | 성공한 Push 발송 수 |
| `failed` | 발송 실패 수 |
| `cleaned` | 만료된 구독 삭제 수 |

### 정상·비정상 예

| 응답 | 해석 |
|------|------|
| HTTP 200 + 위 JSON | 정상 |
| `401` | `CRON_SECRET` 불일치 |
| `500 Missing server configuration` | VAPID 시크릿 누락 |
| `due:0`, `sent:0` | 발송 시각 아직 안 됨 (오류 아님) |
| `due:1`, `sent:0` | 구독 없음 — 시나리오 1 재실행 |

### 체크

- [ ] Run now → HTTP 200
- [ ] 알림 시각 직후 `due ≥ 1`, `sent ≥ 1` 확인

---

## 시나리오 6 — 구독 해제

**목적:** 백그라운드 알림 끄기·DB 정리 확인

### 절차

1. 초록 배너에서 **「백그라운드 알림 끄기」** 클릭
2. 배너가 **「백그라운드 알림 켜기」** 로 돌아가는지 확인
3. `push_subscriptions`에서 해당 `endpoint` 행 삭제 여부 확인

### 기대 결과

- 구독 해제 후 탭을 닫으면 **Push 알림 없음**
- 탭을 열어 두면 시나리오 2 방식(클라이언트 알림)으로만 동작 가능

### 체크

- [ ] 끄기 후 배너 상태 변경
- [ ] (선택) DB에서 구독 행 제거 확인

---

## 추천 한 번에 돌리기 (스모크 테스트)

**소요:** 약 15분

```
1. 시나리오 0  → 배너·배포 확인
2. 시나리오 1  → 백그라운드 알림 켜기
3. 일정 생성   → 제목 "push-smoke-test", 알림 ON, 시작 = 지금+4분
4. 시나리오 3  → 탭 닫고 대기
5. 시나리오 5  → Run now로 Logs에서 sent 확인
```

**성공 기준:** 탭 없이 OS 알림 1회 + (선택) Logs `sent: 1`

---

## 환경별 참고

| 환경 | 참고 |
|------|------|
| **PC Chrome/Edge** | 가장 수월. 주소창 알림 권한 확인 |
| **모바일** | 홈 화면에 추가(PWA) 후 테스트 권장 |
| **로컬 `npm run dev`** | Push 가능(HTTPS 아님도 localhost 예외). 프로덕션과 별도 구독 |
| **시크릿** | `.env`의 `CRON_SECRET` 등은 Git에 올리지 않음 |

---

## 문제 해결 빠른 표

| 증상 | 확인 순서 |
|------|-----------|
| 배너 없음 | Vercel `VITE_VAPID_PUBLIC_KEY` → Redeploy |
| 구독 실패 | `20260701_web_push.sql` |
| 탭 닫으면 무조건 안 옴 | 시나리오 1 → Cron Run now → 시나리오 5 |
| 5분 넘게 지연 | Cron 주기(5분) — 시작 시각+5분까지 대기 |
| 알림 2번 | Web Push + 탭 알림 동시 — 구독 ON이면 탭 알림은 꺼짐, 새로고침 후 재확인 |

---

## 관련 링크

- [Web Push 설정 가이드](./web-push.md)
- [Supabase 프로젝트 Functions](https://supabase.com/dashboard/project/pwkagsqphsfvuvbzclqy/functions)
- [배포 Dashboard](https://dashboard-zeta-sable-71.vercel.app/dashboard)
