const PREFIX = '[event-validation]'

/** 개발 모드에서만 일정 검증·저장 흐름 로그 */
export function eventDebugLog(step: string, data?: unknown): void {
  if (!import.meta.env.DEV) return
  if (data !== undefined) {
    console.log(PREFIX, step, data)
  } else {
    console.log(PREFIX, step)
  }

  fetch('/__dev/event-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ step, data, at: new Date().toISOString() }),
    keepalive: true,
  }).catch(() => {
    // dev 서버 미연결 시 무시
  })
}
