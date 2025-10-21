import CryptoJS from 'crypto-js';

/**
 * 이메일을 MD5 해시로 변환하는 함수
 * Gravatar API에서 사용하는 해시 형식으로 변환합니다.
 * 
 * @param email - 해시할 이메일 주소
 * @returns MD5 해시 문자열
 * 
 * @example
 * ```typescript
 * const hash = md5('user@example.com');
 * // 결과: 'b58996c504c5638798eb6b511e6f49af'
 * ```
 */
export const md5 = (email: string): string => {
  return CryptoJS.MD5(email.toLowerCase().trim()).toString();
};

/**
 * Gravatar 프로필 이미지 URL 생성 함수
 * 
 * @description 사용자의 이메일을 기반으로 Gravatar 프로필 이미지를 가져옵니다.
 * Gravatar에 등록된 이미지가 없으면 기본 아바타를 표시합니다.
 * 
 * @param email - 사용자 이메일 주소
 * @param size - 이미지 크기 (기본값: 200)
 * @param defaultStyle - 기본 아바타 스타일 (기본값: 'identicon')
 * @returns Gravatar 이미지 URL
 * 
 * @example
 * ```typescript
 * const avatarUrl = getGravatarUrl('user@example.com');
 * // 결과: 'https://www.gravatar.com/avatar/b58996c504c5638798eb6b511e6f49af?d=identicon&s=200'
 * 
 * <img src={avatarUrl} alt="User Avatar" />
 * ```
 */
export const getGravatarUrl = (
  email: string, 
  size: number = 200, 
  defaultStyle: string = 'identicon'
): string => {
  if (!email) {
    return `https://www.gravatar.com/avatar/00000000000000000000000000000000?d=${defaultStyle}&s=${size}`;
  }
  
  const hash = md5(email);
  return `https://www.gravatar.com/avatar/${hash}?d=${defaultStyle}&s=${size}`;
};

/**
 * 기본 아바타 스타일 옵션들
 */
export const GRAVATAR_DEFAULT_STYLES = {
  IDENTICON: 'identicon',     // 기하학적 패턴
  MONSTERID: 'monsterid',     // 몬스터 모양
  WAVATAR: 'wavatar',         // 얼굴 모양
  RETRO: 'retro',             // 레트로 스타일
  ROBOHASH: 'robohash',       // 로봇 모양
  BLANK: 'blank',             // 빈 이미지
  MP: 'mp',                   // 미스터 포테이토
} as const;
