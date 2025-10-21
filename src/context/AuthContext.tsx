import { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserInfo, LoginRequest, SignUpRequest } from '../types/auth'
import { signIn as authSignIn, signUp as authSignUp } from '../services/auth'
import { getGravatarUrl } from '../utils/gravatar'

interface AuthContextType {
  user: User | null
  session: Session | null
  userInfo: UserInfo | null
  loading: boolean
  signIn: (id: string, password: string) => Promise<{ error: Error | null }>
  signUp: (signUpData: SignUpRequest) => Promise<{ error: Error | null }>
  signOut: () => Promise<void>
  // Gravatar 아바타 URL 생성 함수
  getAvatarUrl: (size?: number) => string | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 초기 세션 가져오기
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    }

    getInitialSession()

    // 인증 상태 변화 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])
  
  const signIn = async (id: string, password: string) => {
    const result = await authSignIn({ id, password })
    if (result.user && result.userInfo) {
      setUser(result.user)
      setSession(result.session)
      setUserInfo(result.userInfo)
    }
    return { error: result.error }
  }

  const signUp = async (signUpData: SignUpRequest) => {
    const result = await authSignUp(signUpData)
    if (result.user && result.userInfo) {
      setUser(result.user)
      setSession(result.session)
      setUserInfo(result.userInfo)
    }
    return { error: result.error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    setUserInfo(null)
  }

  // Gravatar 아바타 URL 생성 함수
  const getAvatarUrl = (size: number = 40): string | null => {
    if (!user?.email) return null
    return getGravatarUrl(user.email, size)
  }

  const value = {
    user,
    session,
    userInfo,
    loading,
    signIn,
    signUp,
    signOut,
    getAvatarUrl,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
