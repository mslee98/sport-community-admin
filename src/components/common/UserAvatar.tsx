import { useAuth } from '../../context/AuthContext';
import { getGravatarUrl, GRAVATAR_DEFAULT_STYLES } from '../../utils/gravatar';

interface UserAvatarProps {
  size?: number;
  className?: string;
  fallbackName?: string;
}

/**
 * 사용자 아바타 컴포넌트
 * 
 * @description AuthContext에서 현재 로그인된 사용자의 이메일을 가져와서 Gravatar 아바타를 표시합니다.
 * 로그인되지 않은 경우 기본 아이콘을 표시합니다.
 * 
 * @param size - 이미지 크기 (기본값: 40)
 * @param className - 추가 CSS 클래스
 * @param fallbackName - 폴백용 사용자 이름 (alt 텍스트용)
 * 
 * @example
 * ```tsx
 * <UserAvatar size={48} className="rounded-full" />
 * ```
 */
export const UserAvatar = ({ 
  size = 40, 
  className = '',
  fallbackName = 'User'
}: UserAvatarProps) => {
  const { user, userInfo } = useAuth();

  // 로그인된 사용자가 있는 경우 Gravatar URL 생성
  if (user?.email) {
    const avatarUrl = getGravatarUrl(
      user.email, 
      size, 
      GRAVATAR_DEFAULT_STYLES.IDENTICON
    );
    
    const displayName = userInfo?.name || user.email.split('@')[0] || fallbackName;

    return (
      <img
        src={avatarUrl}
        alt={`${displayName}의 프로필`}
        width={size}
        height={size}
        className={`rounded-full ${className}`}
        loading="lazy"
      />
    );
  }

  // 로그인되지 않은 경우 기본 아이콘 표시
  return (
    <div 
      className={`bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg 
        className="text-gray-500 dark:text-gray-400" 
        fill="currentColor" 
        viewBox="0 0 20 20"
        style={{ width: size * 0.6, height: size * 0.6 }}
      >
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    </div>
  );
};

export default UserAvatar;