// Site 테이블 타입 정의
export interface Site {
  site_seq: string;
  name: string;
  url: string;
  type: 'casino' | 'sports' | 'holdem' | 'sport' | 'mixed';
  is_recommend: boolean;
  recommend_order: number;
  status: 'active' | 'suspended' | 'closed';
  subscriber_count: number;
  view_count: number;
  avg_rating: number;
  created_at: string;
  updated_at: string;
  logo_image?: string; // 사이트 로고 이미지 UUID (File 테이블 참조)
}

// SiteInfo 테이블 타입 정의 (상세 정보용)
export interface SiteInfo {
  site_info_seq: string;
  site_seq: string;
  deposit_min: number;
  first_bonus: number;
  repeat_bonus: number;
  casino_payback: number;
  slot_payback: number;
  rolling_rate: number;
  bet_limit_min: number;
  bet_limit_max: number;
  site_feature?: string;
  deposit_method?: string;
  withdrawal_method?: string;
  created_at: string;
  updated_at: string;
}

// 사이트 필터 타입 정의
export interface SiteFilter {
  type?: 'casino' | 'sports' | 'holdem' | 'sport' | 'mixed';
  status?: 'active' | 'suspended' | 'closed';
  is_recommend?: boolean;
  search?: string;
}

// SitePromotion 테이블 타입 정의 (입플 정보)
export interface SitePromotion {
  promotion_seq: string;
  site_seq: string;
  promotion_type: 'first_deposit' | 'repeat_deposit' | 'special';
  bonus_rate: number; // 보너스 비율 (예: 3+2에서 3)
  bonus_amount: number; // 보너스 금액 (예: 3+2에서 2)
  min_deposit: number; // 최소 입금액
  max_bonus: number; // 최대 보너스
  rolling_rate: number; // 롤링 비율
  is_crypto: boolean; // 가상화폐 입출금 여부
  is_active: boolean; // 활성화 여부
  created_at: string;
  updated_at: string;
}

// 입플 폼 데이터 타입
export interface SitePromotionFormData {
  bonus_rate: number;
  bonus_amount: number;
}

// 사이트 등록용 통합 타입
export interface SiteRegistrationData {
  // 기본 정보
  name: string;
  url: string;
  type: 'casino' | 'sports' | 'holdem' | 'sport' | 'mixed';
  status: 'active' | 'suspended' | 'closed';

  // 상세 정보
  deposit_min: number;
  first_bonus: number;
  repeat_bonus: number;
  casino_payback: number;
  slot_payback: number;
  rolling_rate: number;
  bet_limit_min: number;
  bet_limit_max: number;
  site_feature?: string;
  is_crypto?: boolean;

  // 입플 정보 (배열)
  promotions: SitePromotionFormData[];

  // 로고 이미지 정보 (선택사항)
  logo_image?: string | null;
}

// 사이트 업데이트 요청 타입 정의
export interface UpdateSiteRequest {
  name?: string;
  url?: string;
  type?: 'casino' | 'sports' | 'holdem' | 'sport' | 'mixed';
  is_recommend?: boolean;
  recommend_order?: number;
  status?: 'active' | 'suspended' | 'closed';
  subscriber_count?: number;
  view_count?: number;
  avg_rating?: number;
}
