import type { ReactNode } from 'react'
import { Header } from './Header'

interface BusLayoutProps {
  children: ReactNode
}

/** 버스 페이지 전용 — 화면 크기와 무관하게 모바일 UI 유지 */
export function BusLayout({ children }: BusLayoutProps) {
  return (
    <div className="flex min-h-dvh w-full justify-center bg-border/40">
      <div className="mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden bg-surface text-text-primary shadow-[0_0_0_1px_rgba(15,23,42,0.06)] md:shadow-xl">
        <Header mobileOnly />
        {children}
      </div>
    </div>
  )
}
