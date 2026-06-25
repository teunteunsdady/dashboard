import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { APP_NAME_PREFIX, APP_NAME_SUFFIX } from '../../constants/brand'

const navItems = [
  { label: 'About', to: '/' },
  { label: 'Dashboard', to: '/dashboard' },
]

/** 상단 네비게이션 */
export function Header() {
  const { user, isConfigured, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-surface/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 md:px-6">
        <NavLink to="/" className="text-lg font-bold tracking-tight text-main">
          {APP_NAME_PREFIX}
          <span className="text-sub">{APP_NAME_SUFFIX}</span>
        </NavLink>

        <div className="flex items-center gap-2 md:gap-4">
          <nav className="flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  [
                    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-main/10 text-main'
                      : 'text-text-secondary hover:bg-main/5 hover:text-main',
                  ].join(' ')
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {isConfigured && (
            <div className="hidden h-5 w-px bg-border sm:block" />
          )}

          {isConfigured && user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="text-xs font-medium text-text-secondary hover:text-main"
            >
              로그아웃
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
