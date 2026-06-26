import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { APP_NAME_PREFIX, APP_NAME_SUFFIX } from '../../constants/brand'

const navItems = [
  { label: 'About', to: '/', end: true },
  { label: 'Dashboard', to: '/dashboard' },
  { label: 'Bus', to: '/bus' },
]

function mobileNavLinkClass(isActive: boolean) {
  return [
    'block rounded-2xl px-5 py-3.5 text-center text-base font-medium transition-colors',
    isActive
      ? 'bg-main/10 text-main'
      : 'text-text-primary hover:bg-surface',
  ].join(' ')
}

function navLinkClass(isActive: boolean) {
  return [
    'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-main/10 text-main'
      : 'text-text-secondary hover:bg-main/5 hover:text-main',
  ].join(' ')
}

function MenuIcon({ open }: { open: boolean }) {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      {open ? (
        <path d="M6 6l12 12M18 6L6 18" />
      ) : (
        <>
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h14" />
        </>
      )}
    </svg>
  )
}

function MobileMenuOverlay({
  showDesktopNav,
  isConfigured,
  user,
  onClose,
  onSignOut,
}: {
  showDesktopNav: boolean
  isConfigured: boolean
  user: ReturnType<typeof useAuth>['user']
  onClose: () => void
  onSignOut: () => void
}) {
  return createPortal(
    <div
      className={[
        'mobile-backdrop-enter fixed inset-0 z-[100] flex items-center justify-center p-6',
        showDesktopNav ? 'md:hidden' : '',
      ].join(' ')}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-nav-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="메뉴 닫기"
      />

      <nav
        id="mobile-nav"
        className="mobile-menu-enter relative z-10 w-full max-w-[18rem] rounded-3xl bg-surface-card px-3 py-4 shadow-[0_24px_64px_-28px_rgba(15,23,42,0.45)] ring-1 ring-white/60"
      >
        <p
          id="mobile-nav-title"
          className="mb-2 text-center text-xs font-medium tracking-wide text-text-secondary"
        >
          메뉴
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.end}
                className={({ isActive }) => mobileNavLinkClass(isActive)}
                onClick={onClose}
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        {isConfigured && user && (
          <>
            <div className="my-3 h-px bg-border/50" />
            <button
              type="button"
              onClick={onSignOut}
              className="block w-full rounded-2xl px-5 py-3.5 text-center text-base font-medium text-text-secondary transition-colors hover:bg-surface hover:text-text-primary"
            >
              로그아웃
            </button>
          </>
        )}
      </nav>
    </div>,
    document.body,
  )
}

/** 상단 네비게이션 */
export function Header({ mobileOnly = false }: { mobileOnly?: boolean }) {
  const { user, isConfigured, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!menuOpen) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  const handleSignOut = async () => {
    setMenuOpen(false)
    await signOut()
    navigate('/')
  }

  const showDesktopNav = !mobileOnly

  return (
    <header className="sticky top-0 z-[60] border-b border-border/60 bg-surface/80 backdrop-blur-md">
      <div
        className={[
          'relative',
          showDesktopNav ? 'mx-auto max-w-6xl' : 'w-full',
        ].join(' ')}
      >
        <div
          className={[
            'flex items-center justify-between px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]',
            showDesktopNav ? 'md:px-6 md:py-4' : '',
          ].join(' ')}
        >
          <NavLink
            to="/"
            className="text-lg font-bold tracking-tight text-main"
            onClick={() => setMenuOpen(false)}
          >
            {APP_NAME_PREFIX}
            <span className="text-sub">{APP_NAME_SUFFIX}</span>
          </NavLink>

          <button
            type="button"
            className={[
              'flex h-9 w-9 items-center justify-center rounded-full text-text-secondary transition-colors duration-200',
              menuOpen
                ? 'bg-main/8 text-main'
                : 'hover:bg-main/5 hover:text-main',
              showDesktopNav ? 'md:hidden' : '',
            ].join(' ')}
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
          >
            <MenuIcon open={menuOpen} />
          </button>

          {showDesktopNav && (
            <div className="hidden items-center gap-2 md:flex md:gap-4">
              <nav className="flex items-center gap-1">
                {navItems.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => navLinkClass(isActive)}
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
          )}
        </div>
      </div>

      {menuOpen && (
        <MobileMenuOverlay
          showDesktopNav={showDesktopNav}
          isConfigured={isConfigured}
          user={user}
          onClose={() => setMenuOpen(false)}
          onSignOut={handleSignOut}
        />
      )}
    </header>
  )
}
