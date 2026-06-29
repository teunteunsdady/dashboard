import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { BusAlarmWatcher } from './components/bus/BusAlarmWatcher'
import { BusLayout } from './components/layout/BusLayout'
import { MainLayout } from './components/layout/MainLayout'
import { AboutPage } from './pages/AboutPage'
import { BusPage } from './pages/BusPage'
import { DashboardPage } from './pages/DashboardPage'
import { HomePage } from './pages/HomePage'
import { LedgerPage } from './pages/LedgerPage'
import { LoginPage } from './pages/LoginPage'

/**
 * 앱 루트 컴포넌트
 * - Bus: 모바일 전용 레이아웃 / Dashboard: Supabase 설정 시 로그인 필요
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <BusAlarmWatcher />
        <Routes>
          <Route
            path="/bus"
            element={
              <BusLayout>
                <BusPage />
              </BusLayout>
            }
          />
          <Route element={<MainLayout />}>
            <Route path="/" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/home"
              element={
                <ProtectedRoute>
                  <HomePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ledger"
              element={
                <ProtectedRoute requireFullReadonly>
                  <LedgerPage />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
