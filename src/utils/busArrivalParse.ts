/**
 * 서울시 버스 arrmsg 파싱 — "3분후[1번째 전]", "곧 도착" 등
 * @returns 분 단위 추정치. null이면 알림 판단 불가
 */
export function parseBusArrivalMinutes(message: string): number | null {
  const text = message.trim()
  if (!text || text === '-' || /정보\s*없음|도착\s*정보\s*없음/.test(text)) {
    return null
  }

  if (/곧\s*도착|잠시\s*후|전\s*역\s*출발|막\s*출발/.test(text)) {
    return 0
  }

  if (/운행\s*중|출발\s*대기|회차\s*대기/.test(text)) {
    return 1
  }

  const match = text.match(/(\d+)\s*분/)
  if (match) {
    const minutes = Number.parseInt(match[1], 10)
    return Number.isFinite(minutes) ? minutes : null
  }

  return null
}

export function isArrivalWithinThreshold(
  message: string,
  thresholdMinutes: number,
): boolean {
  const minutes = parseBusArrivalMinutes(message)
  if (minutes === null) return false
  return minutes <= thresholdMinutes
}
