import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { MainLayout } from './components/layout/MainLayout'
import { AboutPage } from './pages/AboutPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'

/**
 * 앱 루트 컴포넌트
 * - About: 공개 / Dashboard: Supabase 설정 시 로그인 필요
 */
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <MainLayout>
          <Routes>
            <Route path="/" element={<AboutPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </MainLayout>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
