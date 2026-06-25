import { APP_NAME } from '../../constants/brand'

/** 페이지 하단 푸터 */
export function Footer() {
  const year = new Date().getFullYear()

  return (
    <footer className="border-t border-border bg-surface-card">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-4 py-8 text-sm text-text-secondary md:flex-row md:px-6">
        <p>© {year} {APP_NAME}. All rights reserved.</p>
        <p className="text-sub">Built with React + Tailwind CSS</p>
      </div>
    </footer>
  )
}
