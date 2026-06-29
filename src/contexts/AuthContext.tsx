import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { resolveAuthEmail } from '../utils/authIdentifier'
import {
  canWriteData,
  fetchUserProfile,
  resolveDataOwnerId,
} from '../services/supabaseProfileService'
import type { UserProfile } from '../types/profile'

interface AuthContextValue {
  user: User | null
  session: Session | null
  profile: UserProfile | null
  loading: boolean
  profileLoading: boolean
  isConfigured: boolean
  canWrite: boolean
  isReadOnly: boolean
  dataOwnerId: string | null
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

/** Supabase 인증 상태 관리 Provider */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured())
  const [profileLoading, setProfileLoading] = useState(false)

  const loadProfile = useCallback(async (nextUser: User | null) => {
    if (!nextUser) {
      setProfile(null)
      setProfileLoading(false)
      return
    }

    setProfileLoading(true)
    try {
      const nextProfile = await fetchUserProfile(nextUser.id)
      setProfile(nextProfile)
    } catch {
      setProfile({ app_role: 'owner', data_owner_id: null })
    } finally {
      setProfileLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setUser(data.session?.user ?? null)
      setLoading(false)
      void loadProfile(data.session?.user ?? null)
    })

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession)
        setUser(nextSession?.user ?? null)
        setLoading(false)
        void loadProfile(nextSession?.user ?? null)
      },
    )

    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Supabase가 설정되지 않았습니다.'
    const { error } = await supabase.auth.signInWithPassword({
      email: resolveAuthEmail(email),
      password,
    })
    return error?.message ?? null
  }, [])

  const signUp = useCallback(async (email: string, password: string) => {
    if (!supabase) return 'Supabase가 설정되지 않았습니다.'
    const { error } = await supabase.auth.signUp({ email, password })
    return error?.message ?? null
  }, [])

  const signOut = useCallback(async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    setProfile(null)
  }, [])

  const canWrite = canWriteData(profile)
  const isReadOnly = profile?.app_role === 'readonly'
  const dataOwnerId = user ? resolveDataOwnerId(user.id, profile) : null

  const value = useMemo(
    () => ({
      user,
      session,
      profile,
      loading,
      profileLoading,
      isConfigured: isSupabaseConfigured(),
      canWrite,
      isReadOnly,
      dataOwnerId,
      signIn,
      signUp,
      signOut,
    }),
    [
      user,
      session,
      profile,
      loading,
      profileLoading,
      canWrite,
      isReadOnly,
      dataOwnerId,
      signIn,
      signUp,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
