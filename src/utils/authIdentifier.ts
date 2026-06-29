const LOCAL_AUTH_DOMAIN =
  import.meta.env.VITE_READONLY_AUTH_DOMAIN ?? 'dashboard.local'

/**
 * Supabase Auth는 이메일이 필요합니다.
 * `@`가 없으면 내부 도메인을 붙여 아이디 형식 로그인을 지원합니다.
 * 예) readOnly → readOnly@dashboard.local
 */
export function resolveAuthEmail(identifier: string): string {
  const trimmed = identifier.trim()
  if (!trimmed) return trimmed
  if (trimmed.includes('@')) return trimmed
  return `${trimmed}@${LOCAL_AUTH_DOMAIN}`
}
