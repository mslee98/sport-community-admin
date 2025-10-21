import type { User, Session } from '@supabase/supabase-js'

// 데이터베이스 테이블 타입 정의
export interface UserInfo {
  id: string
  uid: string
  name: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  updated_at: string
}

export interface AuthInfo {
  uid: string
  email: string
  password: string
  created_at: string
  updated_at: string
}

// 로그인 요청 타입
export interface LoginRequest {
  id: string  // userInfo 테이블의 id
  password: string  // 비밀번호
}

// 로그인 응답 타입
export interface LoginResponse {
  user: User | null
  session: Session | null
  error: Error | null
  userInfo?: UserInfo
}

// 회원가입 요청 타입
export interface SignUpRequest {
  id: string
  name: string
  email: string
  password: string
  role?: 'admin' | 'user'
}
