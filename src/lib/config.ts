// 환경 변수 타입 정의
interface AppConfig {
  supabaseUrl: string
  supabaseAnonKey: string
  appEnv: 'development' | 'production' | 'test'
  appName: string
  apiBaseUrl: string
  apiTimeout: number
  enableAnalytics: boolean
  enableDebug: boolean
}

// 환경 변수 가져오기
const getEnvVar = (key: string, defaultValue?: string): string => {
  const value = import.meta.env[key]
  if (!value && defaultValue === undefined) {
    throw new Error(`Environment variable ${key} is required`)
  }
  return value || defaultValue || ''
}

// 환경별 설정
export const config: AppConfig = {
  supabaseUrl: getEnvVar('VITE_SUPABASE_URL'),
  supabaseAnonKey: getEnvVar('VITE_SUPABASE_ANON_KEY'),
  appEnv: (getEnvVar('VITE_APP_ENV', 'development') as AppConfig['appEnv']),
  appName: getEnvVar('VITE_APP_NAME', 'Sport Community Admin'),
  apiBaseUrl: getEnvVar('VITE_API_BASE_URL', 'http://localhost:3000/api'),
  apiTimeout: parseInt(getEnvVar('VITE_API_TIMEOUT', '10000')),
  enableAnalytics: getEnvVar('VITE_ENABLE_ANALYTICS', 'false') === 'true',
  enableDebug: getEnvVar('VITE_ENABLE_DEBUG', 'true') === 'true',
}

// 개발 환경 확인
export const isDevelopment = config.appEnv === 'development'
export const isProduction = config.appEnv === 'production'
export const isTest = config.appEnv === 'test'

// 디버그 로그 (개발 환경에서만)
export const debugLog = (...args: any[]) => {
  if (config.enableDebug && isDevelopment) {
    console.log('[DEBUG]', ...args)
  }
}

// 환경 변수 검증
export const validateConfig = () => {
  const requiredVars = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']
  
  for (const varName of requiredVars) {
    if (!import.meta.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`)
    }
  }
  
  debugLog('Configuration validated successfully')
}

// 초기화 시 검증 실행
validateConfig()
