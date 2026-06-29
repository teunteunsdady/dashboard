# iPhone에서 버스 도착 정보 쓰기

네이티브 위젯 없이 **홈 화면 바로가기**와 **단축어**로 버스 도착 정보를 확인하는 방법입니다.

- 배포 URL: https://dashboard-zeta-sable-71.vercel.app/bus
- API는 Vercel에 `SEOUL_BUS_API_KEY`가 등록되어 있어야 동작합니다.
- 서울시 버스 API는 **하루 1000회** 제한이 있으니, 자동화는 하루 몇 번 정도로 두는 것을 권장합니다.

---

## 1. 홈 화면에 버스 앱 붙이기

1. iPhone **Safari**에서 아래 주소를 엽니다.

   ```
   https://dashboard-zeta-sable-71.vercel.app/bus
   ```

2. 하단 **공유** 버튼 → **홈 화면에 추가**
3. 이름을 `버스` 등으로 입력 후 **추가**

이후 홈 화면 아이콘을 누르면 `/bus` 페이지가 바로 열립니다.

> 현재 PWA가 아니므로 Safari 없이 완전한 전체 화면 앱 형태는 아닐 수 있습니다.

---

## 2. 단축어용 API URL (정류장별)

| 정류장 | 방향 | API URL |
|--------|------|---------|
| 월계삼호4차 아파트 | 쩐 | `https://dashboard-zeta-sable-71.vercel.app/api/bus/arrivals?stopId=1131-wolgye` |
| 노원구민의 전당 | 집 | `https://dashboard-zeta-sable-71.vercel.app/api/bus/arrivals?stopId=1131-hagye` |
| 월계보건지소 | 집 | `https://dashboard-zeta-sable-71.vercel.app/api/bus/arrivals?stopId=147-deer` |

### stopId 요약

| stopId | 설명 |
|--------|------|
| `1131-wolgye` | 1131번 · 월계삼호4차 아파트 (쩐 방향) |
| `1131-hagye` | 1131번 · 노원구민의 전당 (집 방향) |
| `147-deer` | 147번 · 월계보건지소 (집 방향) |

---

## 3. 단축어 만들기

**단축어** 앱 → **+** → 새 단축어

### 예시: 월계삼호4차 아파트 (쩐 방향)

1. **URL**  
   `https://dashboard-zeta-sable-71.vercel.app/api/bus/arrivals?stopId=1131-wolgye`
2. **URL의 내용 가져오기**
3. **딕셔너리에서 값 가져오기** → 키: `stop`
4. **딕셔너리에서 값 가져오기** (위 `stop` 결과에서) → 키: `arrival1` (이름 예: `첫번째`)
5. 같은 `stop`에서 `stopName`, `routeNumber`도 가져오기
6. **알림 표시** — 예시 본문:
   - 제목: `1131번 · 월계삼호4차 아파트`
   - 본문: `첫번째: (arrival1 값)`

다른 정류장은 1번 **URL**만 위 표의 `stopId`로 바꿔 단축어를 하나씩 더 만들면 됩니다.

### API 응답 예시

```json
{
  "updatedAt": "2026-06-26T08:30:00.000Z",
  "stopId": "1131-wolgye",
  "stop": {
    "stopName": "월계삼호4차 아파트",
    "routeNumber": "1131",
    "travelDirection": "쩐",
    "routeDirection": "중계본동",
    "arrival1": "3분 후",
    "arrival2": "12분 후",
    "arsId": "11323"
  },
  "cached": false,
  "refreshIntervalSec": 86,
  "quota": {
    "used": 1,
    "limit": 1000,
    "remaining": 999
  }
}
```

단축어에서는 `stop` → `arrival1`, `stopName`, `routeNumber` 순으로 값을 꺼내면 됩니다.

---

## 4. 잠금 화면 · 홈 화면 위젯 (단축어)

1. 홈 화면을 길게 누르기 → **위젯 편집**
2. **단축어** 위젯 추가
3. 만든 **버스 조회** 단축어 선택

위젯을 탭하면 단축어가 실행되고, 알림으로 도착 정보를 볼 수 있습니다.  
(실시간 자동 갱신 위젯은 아니며, 탭할 때마다 API를 호출합니다.)

---

## 5. 자동화 (선택)

**자동화** 탭 → **개인용 자동화** → **시간 of Day**

- 예: 평일 오전 8시 → 위에서 만든 단축어 실행 → 알림 표시

API 일일 호출 제한을 고려해 실행 횟수는 적게 설정하세요.

---

## 6. 문제 해결

| 증상 | 확인 사항 |
|------|-----------|
| API 오류 / 빈 응답 | Vercel `SEOUL_BUS_API_KEY` 환경 변수 |
| 단축어가 동작하지 않음 | `localhost`가 아닌 배포 URL 사용 여부 |
| 도착 정보 없음 | 해당 시간대 버스 운행 여부, `stopId` 오타 |

---

## 참고

- **네이티브 iOS 위젯**: Swift 앱 + WidgetKit 필요 (현재 웹 프로젝트만으로는 불가)
- **도착 푸시 알림**: [bus-arrival-alerts.md](./bus-arrival-alerts.md) — Web Push + pg_cron (owner, Push 구독 필요)
