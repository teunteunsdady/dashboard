import { useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { APP_NAME } from '../constants/brand'
import { Card } from '../components/ui/Card'

/** Dashboard 로그인 페이지 (Supabase Auth) */
export function LoginPage() {
  const { user, isConfigured, signIn, signUp } = useAuth()
  const location = useLocation()
  const from = (location.state as { from?: string })?.from ?? '/dashboard'

  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isConfigured) {
    return <Navigate to="/dashboard" replace />
  }

  if (user) {
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    const err =
      mode === 'signin'
        ? await signIn(identifier, password)
        : await signUp(identifier, password)

    if (err) {
      setError(err)
    } else if (mode === 'signup') {
      setMessage('가입 완료! 이메일 인증 후 로그인하세요.')
      setMode('signin')
    }

    setSubmitting(false)
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center px-4 py-14">
      <Card className="w-full">
        <h1 className="text-2xl font-bold text-text-primary">{APP_NAME} 로그인</h1>
        <p className="mt-2 text-sm text-text-secondary">
          여러 기기에서 같은 일정을 사용하려면 로그인하세요.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {mode === 'signin' ? '이메일 또는 아이디' : '이메일'}
            </label>
            <input
              type={mode === 'signin' ? 'text' : 'email'}
              required
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={mode === 'signin' ? '이메일 또는 readOnly' : undefined}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
            />
            {mode === 'signin' && (
              <p className="mt-1.5 text-xs text-text-secondary">
                읽기 전용 계정은 아이디만 입력해도 됩니다. (예: readOnly)
              </p>
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">비밀번호</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-main focus:ring-2 focus:ring-main/20"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {message && <p className="text-sm text-main">{message}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-main py-2.5 text-sm font-medium text-white hover:bg-main-dark disabled:opacity-60"
          >
            {submitting
              ? '처리 중...'
              : mode === 'signin'
                ? '로그인'
                : '회원가입'}
          </button>
        </form>

        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'signin' ? 'signup' : 'signin')
              setError(null)
              setMessage(null)
            }}
            className="text-main hover:underline"
          >
            {mode === 'signin' ? '처음이신가요? 가입하기' : '이미 계정이 있나요? 로그인'}
          </button>
          <Link to="/" className="text-text-secondary hover:text-main">
            About으로
          </Link>
        </div>
      </Card>
    </div>
  )
}
