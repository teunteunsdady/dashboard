import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
  /** false이면 개인 일정 전용 계정 접근 불가 */
  allowPersonalReadonly?: boolean
  /** false이면 전체 읽기 전용만 허용 (가계부 등) */
  requireFullReadonly?: boolean
}

/** Supabase 설정 시 로그인 필요, 미설정 시 localStorage 모드로 통과 */
export function ProtectedRoute({
  children,
  allowPersonalReadonly = true,
  requireFullReadonly = false,
}: ProtectedRouteProps) {
  const {
    user,
    loading,
    isConfigured,
    isReadOnlyPersonal,
    canAccessLedger,
  } = useAuth()
  const location = useLocation()

  if (!isConfigured) return <>{children}</>

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-main/20 border-t-main" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  }

  if (!allowPersonalReadonly && isReadOnlyPersonal) {
    return <Navigate to="/dashboard" replace />
  }

  if (requireFullReadonly && !canAccessLedger) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}
