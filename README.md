# CyanOrbit.yol

개인 포트폴리오·일정 대시보드와 출퇴근 버스 도착 정보를 한곳에서 보는 웹 앱입니다.

**배포:** https://dashboard-zeta-sable-71.vercel.app

---

## 주요 기능

| 페이지 | 경로 | 설명 |
|--------|------|------|
| About | `/` | 프로필, 스킬, 프로젝트 소개 |
| Dashboard | `/dashboard` | FullCalendar 기반 일정 관리 (Supabase 연동 시 로그인 필요) |
| Bus | `/bus` | 서울시 버스 도착 정보 (모바일 UI, 정류장 3곳) |
| Login | `/login` | Supabase 이메일 로그인 |

### Dashboard

- 월간 / 주간 캘린더 뷰
- 카테고리 필터 (개인, 금융, 구독, 취업, 가족, 교회)
- 드래그로 일정 이동, 클릭으로 추가·수정
- Supabase 미설정 시 브라우저 `localStorage`에 저장

### Bus

- 노선 **1131** · **147** 정류장 도착 정보
- 정류장별 출퇴근 방향 표시 (쩐 / 집)
- API 캐시 및 일일 호출 제한 (1,000회)으로 할당량 관리
- iPhone 단축어·홈 화면 활용: [docs/ios-bus-guide.md](docs/ios-bus-guide.md)

---

## 기술 스택

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Calendar:** FullCalendar
- **Backend / DB:** Supabase (Auth, PostgreSQL, RLS)
- **API:** Vercel Serverless (`api/bus/arrivals`)
- **버스 데이터:** 서울시 버스 도착 정보 API (data.seoul.go.kr)

---

## 로컬 실행

```bash
npm install
cp .env.example .env   # 값 채우기
npm run dev
```

브라우저에서 http://localhost:5173 을 엽니다.

| 명령 | 설명 |
|------|------|
| `npm run dev` | 개발 서버 |
| `npm run build` | 프로덕션 빌드 |
| `npm run preview` | 빌드 결과 미리보기 |

---

## 환경 변수

`.env` (로컬) 및 **Vercel → Settings → Environment Variables**에 등록합니다.

| 변수 | 필수 | 설명 |
|------|------|------|
| `VITE_SUPABASE_URL` | Dashboard용 | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | Dashboard용 | Supabase anon / publishable key |
| `SEOUL_BUS_API_KEY` | Bus용 | 서울시 버스 API 인증키 (`VITE_` 접두사 **없음**) |

> `SEOUL_BUS_API_KEY`는 서버에서만 사용합니다. 프론트엔드에 넣지 마세요.

---

## Supabase 설정

1. [Supabase](https://supabase.com)에서 프로젝트 생성
2. SQL Editor에서 `supabase/schema.sql` 실행
3. 카테고리 마이그레이션이 필요하면 `supabase/migrations/20260626_event_categories.sql` 실행
4. Authentication에서 이메일 로그인 활성화
5. `.env`에 URL·anon key 입력 후 개발 서버 재시작

---

## Vercel 배포

1. GitHub 저장소 연결 후 배포
2. 환경 변수 3개 등록 (위 표 참고)
3. `vercel.json`이 SPA 라우팅(`/bus`, `/dashboard` 등)과 `api/` 함수를 처리합니다

빌드 설정 (자동 인식되지 않을 때):

- **Build Command:** `npm run build`
- **Output Directory:** `dist`

---

## 프로젝트 구조

```
├── api/bus/           # Vercel 서버리스 — 버스 도착 API
├── server/            # 버스 API 로직, 캐시, 정류장 설정
├── src/
│   ├── components/    # UI, 캘린더, 레이아웃
│   ├── data/          # 정류장·이벤트·프로필 정적 데이터
│   ├── hooks/         # useEvents, useBusArrivals
│   ├── pages/         # About, Dashboard, Bus, Login
│   └── services/      # Supabase, 버스 API 클라이언트
├── supabase/          # DB 스키마·마이그레이션
├── docs/              # iPhone 버스 활용 가이드
└── vercel.json        # SPA rewrite + 빌드 설정
```

---

## 버스 API

**엔드포인트:** `GET /api/bus/arrivals?stopId={id}`

| stopId | 정류장 | 방향 |
|--------|--------|------|
| `1131-wolgye` | 월계삼호4차 아파트 | 쩐 |
| `1131-hagye` | 노원구민의 전당 | 집 |
| `147-deer` | 월계보건지소 | 집 |

정류장 추가·수정: `server/busStops.ts`, `src/data/busStops.ts`

---

## 콘텐츠 수정

About 페이지 내용은 코드가 아닌 데이터 파일에서 편집합니다.

| 파일 | 내용 |
|------|------|
| `src/data/profile.ts` | 이름, 소개, 연락처 |
| `src/data/projects.ts` | 프로젝트 목록 |
| `src/data/events.ts` | 일정 카테고리 색상, 시드 데이터 |

---

## 라이선스

Private — 개인용 프로젝트
