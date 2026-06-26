/** 서울시 버스 API 일일 호출 한도 */
export const DAILY_API_LIMIT = 1000

/** 선택한 정류장 1곳 조회 = API 1회 */
export const API_CALLS_PER_REFRESH = 1

/** 일일 한도 기준 자동 갱신 간격 (약 1분 26초) */
export const CACHE_TTL_MS = Math.floor(
  (24 * 60 * 60 * 1000) / DAILY_API_LIMIT,
)

/** 클라이언트 폴링 간격 */
export const CLIENT_POLL_MS = 60_000
