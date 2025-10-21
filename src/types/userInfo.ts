// UserInfo 테이블 타입 정의
export type UserRole = "user" | "admin" | "super_admin";

export interface UserInfo {
  id: string;
  uid: string;
  email: string;
  name: string;
  nick_name: string;
  level: number;
  current_exp: number;
  total_exp: number;
  point_balance: number;
  total_earned_point: number;
  total_used_point: number;
  role: UserRole;
  approval_yn: boolean; // true: 승인, false: 미승인
  created_at?: string;
  updated_at?: string;
  profileImage?: string; // 프론트엔드에서만 사용 (프로필 이미지 URL)
}

// 회원 정보 업데이트용 타입
export interface UpdateUserInfoRequest {
  level?: number;
  current_exp?: number;
  point_balance?: number;
  role?: UserRole;
  approval_yn?: boolean;
}

// 회원 목록 필터 타입
export interface UserListFilter {
  role?: UserRole;
  approval_yn?: boolean;
  search?: string; // 이름, 이메일, 닉네임 검색
}

