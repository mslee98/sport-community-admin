import { useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useAuth } from '../../context/AuthContext'

interface AuthGuardProps {
  children: React.ReactNode
  requireAuth?: boolean
}

export const AuthGuard = ({ children, requireAuth = true }: AuthGuardProps) => {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (loading) return // 로딩 중일 때는 아무것도 하지 않음

    if (requireAuth && !user) {
      // 인증이 필요한데 로그인되지 않은 경우
      navigate('/signin')
    } else if (!requireAuth && user) {
      // 인증이 필요없는데 로그인된 경우 (로그인 페이지 등)
      navigate('/dashboard')
    }
  }, [user, loading, navigate, requireAuth])

  // 로딩 중이거나 인증 상태가 맞지 않으면 아무것도 렌더링하지 않음
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  if (requireAuth && !user) {
    return null // 리다이렉트 중
  }

  if (!requireAuth && user) {
    return null // 리다이렉트 중
  }

  return <>{children}</>
}
