import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'
import type { UserInfo, LoginRequest, LoginResponse, SignUpRequest } from '../types/auth'


/**
 * 사용자 정보 조회 함수
 * 
 * @description UserInfo 테이블에서 사용자 ID로 사용자 정보를 조회합니다.
 * 이 함수는 로그인 시 사용자의 기본 정보(이름, 이메일, 역할 등)를 가져오는 데 사용됩니다.
 * 
 * @param id - UserInfo 테이블의 사용자 ID (사용자가 입력하는 고유 식별자)
 * @returns Promise<UserInfo | null> - 사용자 정보 객체 또는 null (조회 실패 시)
 * 
 * @example
 * ```typescript
 * const userInfo = await getUserInfoById('user123');
 * if (userInfo) {
 *   console.log('사용자 이름:', userInfo.name);
 *   console.log('사용자 이메일:', userInfo.email);
 * }
 * ```
 */
export const getUserInfoById = async (id: string): Promise<UserInfo | null> => {
  try {
    // Supabase에서 UserInfo 테이블 조회
    const { data, error } = await supabase
      .from('UserInfo')
      .select('*') // 모든 컬럼 선택
      .eq('id', id) // id가 일치하는 레코드만 조회
      .single() // 단일 레코드 반환 (여러 개가 있으면 에러)

    if (error) {
      console.error('Error fetching user info:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error fetching user info:', error)
    return null
  }
}


/**
 * 사용자 로그인 함수
 * 
 * @description 사용자 ID와 비밀번호를 받아서 로그인을 처리합니다.
 * 로그인 프로세스는 다음과 같습니다:
 * 1. UserInfo 테이블에서 사용자 ID로 사용자 정보 조회
 * 2. 조회된 이메일과 입력받은 비밀번호로 Supabase 인증 실행
 * 3. 성공 시 사용자 정보와 세션을 반환
 * 
 * @param loginRequest - 로그인 요청 객체 (id, password 포함)
 * @returns Promise<LoginResponse> - 로그인 결과 (user, session, error, userInfo)
 * 
 * @example
 * ```typescript
 * const result = await signIn({ id: 'user123', password: 'password123' });
 * if (result.error) {
 *   console.error('로그인 실패:', result.error.message);
 * } else {
 *   console.log('로그인 성공:', result.userInfo?.name);
 * }
 * ```
 */
export const signIn = async (loginRequest: LoginRequest): Promise<LoginResponse> => {
  try {
    // 1단계: UserInfo 테이블에서 사용자 ID로 사용자 정보 조회
    // 사용자가 입력한 ID로 실제 사용자 정보(이름, 이메일, 역할 등)를 가져옵니다.
    const userInfo = await getUserInfoById(loginRequest.id)
    if (!userInfo) {
      return {
        user: null,
        session: null,
        error: new Error('사용자 정보를 찾을 수 없습니다'),
      }
    }

    // 2단계: Supabase 내장 인증 시스템으로 로그인 실행
    // UserInfo에서 가져온 이메일과 사용자가 입력한 비밀번호로 실제 인증을 수행합니다.
    const { data, error } = await supabase.auth.signInWithPassword({
      email: userInfo.email, // UserInfo 테이블의 이메일 사용
      password: loginRequest.password, // 사용자가 입력한 비밀번호
    })

    // 인증 실패 시 에러 반환
    if (error) {
      return {
        user: null,
        session: null,
        error: error,
      }
    }

    // 로그인 성공 시 사용자 정보와 세션을 함께 반환
    return {
      user: data.user, // Supabase 인증 사용자 객체
      session: data.session, // 인증 세션
      error: null,
      userInfo: userInfo, // 추가 사용자 정보 (이름, 역할 등)
    }
  } catch (error) {
    // 예상치 못한 에러 발생 시
    return {
      user: null,
      session: null,
      error: error as Error,
    }
  }
}

/**
 * 사용자 회원가입 함수
 * 
 * @description 새로운 사용자를 등록합니다. 회원가입 프로세스는 다음과 같습니다:
 * 1. Supabase 내장 인증 시스템에 사용자 생성 (이메일, 비밀번호)
 * 2. UserInfo 테이블에 추가 사용자 정보 저장 (ID, 이름, 역할 등)
 * 3. 실패 시 롤백 처리로 데이터 일관성 유지
 * 
 * @param signUpRequest - 회원가입 요청 객체 (id, name, email, password, role 포함)
 * @returns Promise<LoginResponse> - 회원가입 결과 (user, session, error, userInfo)
 * 
 * @example
 * ```typescript
 * const result = await signUp({
 *   id: 'newuser123',
 *   name: '홍길동',
 *   email: 'hong@example.com',
 *   password: 'password123',
 *   role: 'user'
 * });
 * ```
 */
export const signUp = async (signUpRequest: SignUpRequest): Promise<LoginResponse> => {
  try {
    // 1단계: Supabase 내장 인증 시스템에 사용자 생성
    // 이메일과 비밀번호로 실제 인증 가능한 사용자를 생성합니다.
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signUpRequest.email,
      password: signUpRequest.password,
      options: {
        data: {
          name: signUpRequest.name, // Supabase 사용자 메타데이터에 이름 저장
        },
      },
    })

    // 인증 사용자 생성 실패 시 에러 반환
    if (authError || !authData.user) {
      return {
        user: null,
        session: null,
        error: authError || new Error('사용자 생성에 실패했습니다'),
      }
    }

    // 2단계: UserInfo 테이블에 추가 사용자 정보 저장
    // 사용자 정의 ID, 이름, 역할 등의 추가 정보를 별도 테이블에 저장합니다.
    const { data: userInfoData, error: userInfoError } = await supabase
      .from('UserInfo')
      .insert({
        id: signUpRequest.id, // 사용자가 입력하는 고유 ID
        uid: authData.user.id, // Supabase 인증 시스템의 사용자 ID (외래키)
        name: signUpRequest.name, // 사용자 이름
        email: signUpRequest.email, // 이메일 (중복 저장으로 조회 성능 향상)
        role: signUpRequest.role || 'user', // 사용자 역할 (기본값: 'user')
      })
      .select()
      .single()

    // UserInfo 저장 실패 시 롤백 처리
    if (userInfoError) {
      // 생성된 Supabase 인증 사용자를 삭제하여 데이터 일관성 유지
      await supabase.auth.admin.deleteUser(authData.user.id)
      return {
        user: null,
        session: null,
        error: userInfoError,
      }
    }

    // 회원가입 성공 시 사용자 정보와 세션을 함께 반환
    return {
      user: authData.user, // Supabase 인증 사용자 객체
      session: authData.session, // 인증 세션
      error: null,
      userInfo: userInfoData, // 추가 사용자 정보
    }
  } catch (error) {
    // 예상치 못한 에러 발생 시
    return {
      user: null,
      session: null,
      error: error as Error,
    }
  }
}

/**
 * 사용자 로그아웃 함수
 * 
 * @description 현재 로그인된 사용자를 로그아웃 처리합니다.
 * Supabase 세션을 무효화하여 사용자의 인증 상태를 해제합니다.
 * 
 * @returns Promise<{ error: Error | null }> - 로그아웃 결과
 * 
 * @example
 * ```typescript
 * const { error } = await signOut();
 * if (error) {
 *   console.error('로그아웃 실패:', error.message);
 * } else {
 *   console.log('로그아웃 성공');
 * }
 * ```
 */
export const signOut = async (): Promise<{ error: Error | null }> => {
  try {
    // Supabase 인증 시스템에서 로그아웃 처리
    const { error } = await supabase.auth.signOut()
    return { error }
  } catch (error) {
    return { error: error as Error }
  }
}

/**
 * 현재 로그인된 사용자 정보 조회 함수
 * 
 * @description 현재 인증된 사용자의 정보를 가져옵니다.
 * 이 함수는 페이지 새로고침 후에도 사용자 정보를 확인할 때 사용됩니다.
 * 
 * @returns Promise<User | null> - 현재 사용자 객체 또는 null (로그인되지 않은 경우)
 * 
 * @example
 * ```typescript
 * const currentUser = await getCurrentUser();
 * if (currentUser) {
 *   console.log('현재 사용자:', currentUser.email);
 * } else {
 *   console.log('로그인되지 않음');
 * }
 * ```
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    // Supabase에서 현재 인증된 사용자 정보 조회
    const { data: { user } } = await supabase.auth.getUser()
    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * 현재 세션 정보 조회 함수
 * 
 * @description 현재 활성화된 인증 세션 정보를 가져옵니다.
 * 세션에는 사용자 정보, 토큰, 만료 시간 등이 포함됩니다.
 * 
 * @returns Promise<Session | null> - 현재 세션 객체 또는 null (세션이 없는 경우)
 * 
 * @example
 * ```typescript
 * const session = await getSession();
 * if (session) {
 *   console.log('세션 만료 시간:', session.expires_at);
 * } else {
 *   console.log('활성 세션 없음');
 * }
 * ```
 */
export const getSession = async (): Promise<Session | null> => {
  try {
    // Supabase에서 현재 세션 정보 조회
    const { data: { session } } = await supabase.auth.getSession()
    return session
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}
