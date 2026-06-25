import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
  children: React.ReactNode
}

/** Supabase 설정 시 로그인 필요, 미설정 시 localStorage 모드로 통과 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, isConfigured } = useAuth()
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

  return <>{children}</>
}
