import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Footer } from './Footer'

/** 전체 페이지 레이아웃 래퍼 (Header + Content + Footer) */
export function MainLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}
