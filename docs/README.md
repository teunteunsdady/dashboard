# 문서 목록

CyanOrbit.yol (personal-dashboard) 운영·개발 문서입니다.

---

## 빠른 링크

| 문서 | 내용 |
|------|------|
| [기능 개요](./features-overview.md) | 구현된 기능·아키텍처·주요 URL |
| **[장애 대응 런북](./runbook.md)** | 증상별 확인 순서·로그 위치 |
| [Web Push](./web-push.md) | 백그라운드 일정 알림 |
| [버스 도착 알림](./bus-arrival-alerts.md) | 백그라운드 버스 Web Push |
| [Web Push 테스트](./web-push-test-scenarios.md) | 알림 시나리오 체크리스트 |
| [readOnly 계정](./readonly-account.md) | readOnly / readOnly2 |
| [readOnly 비밀번호 Cron](./readonly-cron.md) | 매월 자동 비밀번호 변경 |
| [iOS 버스 활용](./ios-bus-guide.md) | 홈 화면·단축어 |

---

## 외부 대시보드

| 서비스 | URL |
|--------|-----|
| **배포 사이트** | https://dashboard-zeta-sable-71.vercel.app |
| **Supabase 프로젝트** | https://supabase.com/dashboard/project/pwkagsqphsfvuvbzclqy |
| **GitHub** | https://github.com/teunteunsdady/dashboard |

**스케줄(cron):** Supabase **pg_cron** (외부 cron-job.org 불필요)

| Job | 스케줄 | 호출 |
|-----|--------|------|
| `send-push-reminders-5min` | `*/5 * * * *` | 일정 + 버스 Push |
| `rotate-readonly-password-daily` | `5 15 * * *` (UTC) | readOnly·readOnly2 비밀번호 |

---

## 환경 변수 한눈에

| 변수 | 어디에 | 용도 |
|------|--------|------|
| `VITE_SUPABASE_URL` | Vercel, `.env` | 프론트 Supabase |
| `VITE_SUPABASE_ANON_KEY` | Vercel, `.env` | 프론트 Supabase |
| `VITE_VAPID_PUBLIC_KEY` | Vercel, `.env` | Web Push 구독 |
| `SEOUL_BUS_API_KEY` | Vercel, Supabase Secrets | 버스 API |
| `SUPABASE_URL` | Vercel | 버스 한도 집계 API |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | 버스 한도 집계 API |
| `CRON_SECRET` | Supabase Secrets, `.env`, Vault | Edge Function cron 인증 |
| `VAPID_*` | Supabase Secrets | Push 발송 Edge Function |
| `READONLY_*` | Supabase Secrets | `rotate-readonly-password` |
| `READONLY2_USER_EMAIL` | Supabase Secrets (선택) | 기본 `readOnly2@dashboard.local` |

자세한 표는 [기능 개요](./features-overview.md) 및 [런북](./runbook.md)을 참고하세요.

---

## SQL·스크립트 (수동 실행)

| 경로 | 용도 |
|------|------|
| `supabase/schema.sql` | 전체 스키마 초기화 |
| `supabase/migrations/*.sql` | 기능별 마이그레이션 |
| `supabase/scripts/setup-readonly-user.sql` | readOnly 역할 수동 연결 |
| `supabase/scripts/setup-readonly-cron.sql` | Vault cron 시크릿 등록 |

---

## 장애가 났을 때

**먼저 [runbook.md](./runbook.md) 를 여세요.**  
증상(로그인, 알림, 버스, readOnly 등)별로 **어디 로그를 볼지**, **어떤 SQL을 치면 되는지** 정리돼 있습니다.
