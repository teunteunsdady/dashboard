import type { ReactNode } from 'react'
import { Header } from './Header'
import { Footer } from './Footer'

interface MainLayoutProps {
  children: ReactNode
}

/** 전체 페이지 레이아웃 래퍼 (Header + Content + Footer) */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
