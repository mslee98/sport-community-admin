import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ComponentCard from "../../components/common/ComponentCard.tsx";
import { PageMeta } from "../../components/common/PageMeta.tsx";
import LoadingSpinner from "../../components/common/LoadingSpinner.tsx";
import { SiteEventModal } from "../../components/SiteManagement/SiteEventModal.tsx";
import { ImageUpload } from '../../components/common/ImageUpload';
import Label from '../../components/form/Label';
import { fetchSiteWithInfo, addPromotion, updatePromotion, deletePromotion, updateSite, updateSiteInfo, fetchSiteEvents, deleteSiteEvent } from '../../services/site';
import type { Site, SiteDepositPromotion, SiteEvent } from '../../types/site';

export default function SiteDetail() {
  const { siteSeq } = useParams<{ siteSeq: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // 상태 관리
  const [isAddingPromotion, setIsAddingPromotion] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<string | null>(null);
  const [isEditingBasicInfo, setIsEditingBasicInfo] = useState(false);
  const [isEditingSiteInfo, setIsEditingSiteInfo] = useState(false);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SiteEvent | null>(null);
  const [basicInfoForm, setBasicInfoForm] = useState({
    name: '',
    url: '',
    type: 'casino' as 'casino' | 'sports' | 'holdem' | 'sport' | 'mixed',
    status: 'active' as 'active' | 'suspended' | 'closed',
  });
  
  // 로고 이미지 관련 상태
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);
  const [originalLogoImage, setOriginalLogoImage] = useState<string | null>(null);
  const [siteInfoForm, setSiteInfoForm] = useState({
    deposit_min: 0,
    first_bonus: 0,
    repeat_bonus: 0,
    casino_payback: 0,
    slot_payback: 0,
    rolling_rate: 0,
    bet_limit_min: 0,
    bet_limit_max: 0,
    site_feature: '',
    deposit_method: '',
    withdrawal_method: '',
  });

  const [promotionForm, setPromotionForm] = useState({
    promotion_name: '',
    deposit_type: 'first' as 'first' | 'repeat' | 'daily' | 'weekly' | 'monthly' | 'special',
    bonus_rate: 0,
    bonus_amount: 0,
    max_bonus: 0,
    min_deposit: 0,
    rollover_requirement: 0,
    valid_days: 0,
    description: '',
    terms_conditions: '',
    is_active: true,
    display_order: 0,
  });

  // 사이트 상세 정보 조회
  const { data: siteData, isLoading, isFetching, error } = useQuery({
    queryKey: ['site', siteSeq],
    queryFn: () => fetchSiteWithInfo(siteSeq!),
    enabled: !!siteSeq,
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  const site = siteData?.data;
  const siteInfo = site?.site_info;
  const promotions = site?.promotions || [];

  // 사이트 이벤트 조회
  const { data: eventsData } = useQuery({
    queryKey: ['site-events', siteSeq],
    queryFn: () => fetchSiteEvents(siteSeq!),
    enabled: !!siteSeq,
  });

  const events = eventsData?.data || [];

  // 로고 이미지 URL 조회
  const { data: logoData } = useQuery({
    queryKey: ['site-logo', site?.logo_image],
    queryFn: async () => {
      if (!site?.logo_image) return null;
      const { supabase } = await import('../../lib/supabase');
      const { data } = await supabase
        .from('File')
        .select('file_url')
        .eq('file_seq', site.logo_image)
        .single();
      return data?.file_url || null;
    },
    enabled: !!site?.logo_image,
  });

  const logoUrl = logoData;

  // 로고 URL 변경 시 상태 업데이트
  useEffect(() => {
    if (logoUrl && !logoImageUrl) {
      setLogoImageUrl(logoUrl);
    }
  }, [logoUrl, logoImageUrl]);

  // 사이트 기본 정보 수정 mutation
  const updateSiteMutation = useMutation({
    mutationFn: ({ siteSeq, updates }: { siteSeq: string; updates: any }) =>
      updateSite(siteSeq, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteSeq] });
      queryClient.invalidateQueries({ queryKey: ['site-logo', logoImage] });
      toast.success('사이트 기본 정보가 수정되었습니다.');
      setIsEditingBasicInfo(false);
      // 상태 초기화
      setBasicInfoForm({ name: '', url: '', type: 'casino', status: 'active' });
      setLogoImage(null);
      setLogoImageUrl(null);
      setOriginalLogoImage(null);
    },
    onError: (error) => {
      toast.error(`사이트 정보 수정에 실패했습니다: ${error.message}`);
    },
  });

  // 사이트 운영 정보 수정 mutation
  const updateSiteInfoMutation = useMutation({
    mutationFn: ({ siteSeq, updates }: { siteSeq: string; updates: typeof siteInfoForm }) =>
      updateSiteInfo(siteSeq, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteSeq] });
      toast.success('사이트 운영 정보가 수정되었습니다.');
      setIsEditingSiteInfo(false);
    },
    onError: (error) => {
      toast.error(`사이트 운영 정보 수정에 실패했습니다: ${error.message}`);
    },
  });

  // 입플 추가 mutation
  const addPromotionMutation = useMutation({
    mutationFn: (data: typeof promotionForm) => addPromotion(siteSeq!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteSeq] });
      toast.success('입플이 추가되었습니다.');
      setIsAddingPromotion(false);
      setPromotionForm({
        promotion_name: '',
        deposit_type: 'first' as 'first' | 'repeat' | 'daily' | 'weekly' | 'monthly' | 'special',
        bonus_rate: 0,
        bonus_amount: 0,
        max_bonus: 0,
        min_deposit: 0,
        rollover_requirement: 0,
        valid_days: 0,
        description: '',
        terms_conditions: '',
        is_active: true,
        display_order: 0,
      });
    },
    onError: (error) => {
      toast.error(`입플 추가에 실패했습니다: ${error.message}`);
    },
  });

  // 입플 수정 mutation
  const updatePromotionMutation = useMutation({
    mutationFn: ({ promotionSeq, updates }: { promotionSeq: string; updates: Partial<typeof promotionForm> }) =>
      updatePromotion(promotionSeq, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteSeq] });
      toast.success('입플이 수정되었습니다.');
      setEditingPromotion(null);
    },
    onError: (error) => {
      toast.error(`입플 수정에 실패했습니다: ${error.message}`);
    },
  });

  // 입플 삭제 mutation
  const deletePromotionMutation = useMutation({
    mutationFn: deletePromotion,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site', siteSeq] });
      toast.success('입플이 삭제되었습니다.');
    },
    onError: (error) => {
      toast.error(`입플 삭제에 실패했습니다: ${error.message}`);
    },
  });

  // 사이트 이벤트 삭제 mutation
  const deleteEventMutation = useMutation({
    mutationFn: deleteSiteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-events', siteSeq] });
      toast.success('이벤트가 삭제되었습니다.');
    },
    onError: (error) => {
      toast.error(`이벤트 삭제에 실패했습니다: ${error.message}`);
    },
  });

  // 핸들러 함수들
  const handleEditBasicInfo = () => {
    if (site) {
      setBasicInfoForm({
        name: site.name,
        url: site.url,
        type: site.type,
        status: site.status,
      });
      
      // 기존 로고 이미지 정보 설정
      setLogoImage(site.logo_image || null);
      setOriginalLogoImage(site.logo_image || null);
      setIsEditingBasicInfo(true);
    }
  };

  const handleSaveBasicInfo = () => {
    if (siteSeq) {
      // 로고 이미지가 변경되었는지 확인
      const logoUpdate = logoImage !== originalLogoImage ? { logo_image: logoImage } : {};
      
      updateSiteMutation.mutate({ 
        siteSeq, 
        updates: { ...basicInfoForm, ...logoUpdate } 
      });
    }
  };

  const handleCancelBasicInfoEdit = () => {
    setIsEditingBasicInfo(false);
    setBasicInfoForm({ name: '', url: '', type: 'casino', status: 'active' });
    setLogoImage(null);
    setLogoImageUrl(null);
    setOriginalLogoImage(null);
  };
  
  // 로고 이미지 핸들러
  const handleLogoUpload = (fileSeq: string, fileUrl: string) => {
    setLogoImage(fileSeq);
    setLogoImageUrl(fileUrl);
  };

  const handleLogoRemove = () => {
    setLogoImage(null);
    setLogoImageUrl(null);
  };

  const handleEditSiteInfo = () => {
    if (siteInfo) {
      setSiteInfoForm({
        deposit_min: siteInfo.deposit_min || 0,
        first_bonus: siteInfo.first_bonus || 0,
        repeat_bonus: siteInfo.repeat_bonus || 0,
        casino_payback: siteInfo.casino_payback || 0,
        slot_payback: siteInfo.slot_payback || 0,
        rolling_rate: siteInfo.rolling_rate || 0,
        bet_limit_min: siteInfo.bet_limit_min || 0,
        bet_limit_max: siteInfo.bet_limit_max || 0,
        site_feature: siteInfo.site_feature || '',
        deposit_method: siteInfo.deposit_method || '',
        withdrawal_method: siteInfo.withdrawal_method || '',
      });
      setIsEditingSiteInfo(true);
    }
  };

  const handleSaveSiteInfo = () => {
    if (siteSeq) {
      updateSiteInfoMutation.mutate({ siteSeq, updates: siteInfoForm });
    }
  };

  const handleCancelSiteInfoEdit = () => {
    setIsEditingSiteInfo(false);
    setSiteInfoForm({
      deposit_min: 0,
      first_bonus: 0,
      repeat_bonus: 0,
      casino_payback: 0,
      slot_payback: 0,
      rolling_rate: 0,
      bet_limit_min: 0,
      bet_limit_max: 0,
      site_feature: '',
      deposit_method: '',
      withdrawal_method: '',
    });
  };

  const handleDeletePromotion = (promotionSeq: string) => {
    if (window.confirm('정말로 이 입플을 삭제하시겠습니까?')) {
      deletePromotionMutation.mutate(promotionSeq);
    }
  };

  const handleAddPromotion = () => {
    addPromotionMutation.mutate(promotionForm);
  };

  const handleEditPromotion = (promotion: SiteDepositPromotion) => {
    setEditingPromotion(promotion.promotion_seq);
    setPromotionForm({
      promotion_name: promotion.promotion_name,
      deposit_type: promotion.deposit_type,
      bonus_rate: promotion.bonus_rate,
      bonus_amount: promotion.bonus_amount,
      max_bonus: promotion.max_bonus,
      min_deposit: promotion.min_deposit,
      rollover_requirement: promotion.rollover_requirement,
      valid_days: promotion.valid_days,
      description: promotion.description || '',
      terms_conditions: promotion.terms_conditions || '',
      is_active: promotion.is_active,
      display_order: promotion.display_order,
    });
  };

  const handleUpdatePromotion = () => {
    if (editingPromotion) {
      updatePromotionMutation.mutate({ promotionSeq: editingPromotion, updates: promotionForm });
    }
  };

  const handleCancelEdit = () => {
    setEditingPromotion(null);
    setIsAddingPromotion(false);
    setPromotionForm({
      promotion_name: '',
      deposit_type: 'first' as 'first' | 'repeat' | 'daily' | 'weekly' | 'monthly' | 'special',
      bonus_rate: 0,
      bonus_amount: 0,
      max_bonus: 0,
      min_deposit: 0,
      rollover_requirement: 0,
      valid_days: 0,
      description: '',
      terms_conditions: '',
      is_active: true,
      display_order: 0,
    });
  };

  // 사이트 이벤트 핸들러 함수들
  const handleOpenEventModal = (event?: SiteEvent) => {
    if (event) {
      setEditingEvent(event);
    } else {
      setEditingEvent(null);
    }
    setIsEventModalOpen(true);
  };

  const handleCloseEventModal = () => {
    setIsEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleDeleteEvent = (eventSeq: string) => {
    if (window.confirm('정말로 이 이벤트를 삭제하시겠습니까?')) {
      deleteEventMutation.mutate(eventSeq);
    }
  };

  // 상태 라벨 함수
  const getStatusLabel = (status: Site['status']) => {
    switch (status) {
      case 'active':
        return '운영중';
      case 'suspended':
        return '일시중단';
      case 'closed':
        return '폐쇄';
      default:
        return '알 수 없음';
    }
  };

  // 상태 배지 색상 함수
  const getStatusBadgeColor = (status: Site['status']) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'suspended':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'closed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // 타입 라벨 함수
  const getTypeLabel = (type: Site['type']) => {
    switch (type) {
      case 'casino':
        return '카지노';
      case 'sports':
        return '스포츠';
      case 'holdem':
        return '홀덤';
      case 'sport':
        return '스포츠';
      case 'mixed':
        return '혼합';
      default:
        return '알 수 없음';
    }
  };

  // 타입 배지 색상 함수
  const getTypeBadgeColor = (type: Site['type']) => {
    switch (type) {
      case 'casino':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'sports':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'holdem':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'sport':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'mixed':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // 입플 타입 라벨 함수
  const getPromotionTypeLabel = (type: string) => {
    switch (type) {
      case 'first':
        return '첫 충전';
      case 'repeat':
        return '매 충전';
      case 'daily':
        return '일일';
      case 'weekly':
        return '주간';
      case 'monthly':
        return '월간';
      case 'special':
        return '특별';
      default:
        return '알 수 없음';
    }
  };

  // 입플 타입 배지 색상 함수
  const getPromotionTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'first':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'repeat':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'daily':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'weekly':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'monthly':
        return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/20 dark:text-indigo-400';
      case 'special':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // 이벤트 타입 라벨 함수
  const getEventTypeLabel = (type: SiteEvent['event_type']) => {
    switch (type) {
      case 'bonus':
        return '보너스';
      case 'cashback':
        return '캐시백';
      case 'tournament':
        return '토너먼트';
      case 'special':
        return '특별';
      case 'seasonal':
        return '시즌';
      default:
        return '알 수 없음';
    }
  };

  // 이벤트 타입 배지 색상 함수
  const getEventTypeBadgeColor = (type: SiteEvent['event_type']) => {
    switch (type) {
      case 'bonus':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'cashback':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'tournament':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'special':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'seasonal':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // 이벤트 상태 라벨 함수
  const getEventStatusLabel = (status: SiteEvent['status']) => {
    switch (status) {
      case 'before':
        return '시작 전';
      case 'ongoing':
        return '진행중';
      case 'ended':
        return '종료';
      default:
        return '알 수 없음';
    }
  };

  // 이벤트 상태 배지 색상 함수
  const getEventStatusBadgeColor = (status: SiteEvent['status']) => {
    switch (status) {
      case 'before':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
      case 'ongoing':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'ended':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  // 캐시된 데이터가 없고 처음 로딩 중일 때만 전체 화면 로딩 표시
  if (isLoading && !site) {
    return <LoadingSpinner fullScreen size="xl" />;
  }

  // 에러가 발생했거나 데이터가 없을 때
  if (error || (!isLoading && !site)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
            사이트를 찾을 수 없습니다
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {error ? `오류: ${error.message}` : '요청하신 사이트가 존재하지 않거나 삭제되었습니다.'}
          </p>
          <button
            onClick={() => navigate('/site-management')}
            className="px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
          >
            사이트 목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // 사이트 데이터가 없으면 로딩 표시
  if (!site) {
    return <LoadingSpinner fullScreen size="xl" />;
  }

  return (
    <>
      <PageMeta
        title={`${site.name} 상세보기 | 스포츠 커뮤니티 관리자`}
        description={`${site.name} 사이트의 상세 정보를 확인하고 관리합니다.`}
      />

      {/* 백그라운드 새로고침 로딩 인디케이터 */}
      {isFetching && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-brand-500 animate-pulse"></div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/site-management')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
            title="사이트 목록으로 돌아가기"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-xl font-semibold text-gray-800 dark:text-white/90">
              {site.name}
            </span>
          </button>
        </div>
        
        <nav>
          <ol className="flex items-center gap-1.5">
            <li>
              <a
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                href="/dashboard"
              >
                Home
                <svg className="stroke-current" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </a>
            </li>
            <li>
              <a
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                href="/site-management"
              >
                사이트 관리
                <svg className="stroke-current" width="17" height="16" viewBox="0 0 17 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366" stroke="" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"></path>
                </svg>
              </a>
            </li>
            <li className="text-sm text-gray-800 dark:text-white/90">
              {site.name}
            </li>
          </ol>
        </nav>
      </div>

      <div className="space-y-6">
        {/* 사이트 기본 정보 */}
        <ComponentCard title="사이트 기본 정보">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex w-full flex-col items-center gap-6 xl:flex-row">
              {/* 로고 이미지 */}
              <div className="h-20 w-20 overflow-hidden rounded-full border border-gray-200 dark:border-gray-800">
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={`${site.name} 로고`}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                    <span className="text-xs text-gray-500 dark:text-gray-400">로고</span>
                  </div>
                )}
              </div>
              
              {/* 사이트 정보 */}
              <div className="order-3 xl:order-2 flex-1">
                {isEditingBasicInfo ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        사이트명
                      </label>
                      <input
                        type="text"
                        value={basicInfoForm.name}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, name: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="사이트명을 입력하세요"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        도메인 주소
                      </label>
                      <input
                        type="url"
                        value={basicInfoForm.url}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        사이트 타입
                      </label>
                      <select
                        value={basicInfoForm.type}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, type: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="casino">카지노</option>
                        <option value="sports">스포츠</option>
                        <option value="holdem">홀덤</option>
                        <option value="sport">스포츠</option>
                        <option value="mixed">혼합</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        사이트 상태
                      </label>
                      <select
                        value={basicInfoForm.status}
                        onChange={(e) => setBasicInfoForm({ ...basicInfoForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="active">운영중</option>
                        <option value="suspended">일시중단</option>
                        <option value="closed">폐쇄</option>
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="logo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        사이트 로고
                      </Label>
                      <ImageUpload
                        onImageUpload={handleLogoUpload}
                        onImageRemove={handleLogoRemove}
                        currentImageUrl={logoImageUrl || undefined}
                        currentFileSeq={logoImage || undefined}
                        accept="image/*"
                        maxSize={2}
                        className="w-full"
                      />
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        권장 크기: 200x200px, 최대 2MB
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSaveBasicInfo}
                        disabled={updateSiteMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md transition-colors disabled:opacity-50"
                      >
                        {updateSiteMutation.isPending ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={handleCancelBasicInfoEdit}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 className="mb-2 text-center text-lg font-semibold text-gray-800 xl:text-left dark:text-white/90">
                      {site.name}
                    </h4>
                        <div className="mb-2 text-center xl:text-left space-y-1">
                          <div>
                            <a
                              href={site.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 underline"
                            >
                              {site.url}
                            </a>
                          </div>
                        </div>
                        <div className="flex flex-col items-center gap-1 text-center xl:flex-row xl:gap-3 xl:text-left">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeBadgeColor(site.type)}`}>
                            {getTypeLabel(site.type)}
                          </span>
                          <div className="hidden h-3.5 w-px bg-gray-300 xl:block dark:bg-gray-700"></div>
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusBadgeColor(site.status)}`}>
                            {getStatusLabel(site.status)}
                          </span>
                        </div>
                  </div>
                )}
              </div>
              
              {/* 액션 버튼들 */}
              <div className="order-2 flex grow items-center gap-2 xl:order-3 xl:justify-end">
                <button
                  onClick={() => window.open(site.url, '_blank')}
                  className="shadow-theme-xs flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                  title="사이트 방문"
                >
                  <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10.8333 3.33333H16.6667C17.1087 3.33333 17.5326 3.50893 17.8452 3.82149C18.1577 4.13405 18.3333 4.55797 18.3333 5V15C18.3333 15.442 18.1577 15.866 17.8452 16.1785C17.5326 16.4911 17.1087 16.6667 16.6667 16.6667H3.33333C2.89131 16.6667 2.46738 16.4911 2.15482 16.1785C1.84226 15.866 1.66667 15.442 1.66667 15V5C1.66667 4.55797 1.84226 4.13405 2.15482 3.82149C2.46738 3.50893 2.89131 3.33333 3.33333 3.33333H9.16667L10.8333 3.33333Z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M10.8333 3.33333V1.66667C10.8333 1.22464 11.0089 0.800716 11.3215 0.488155C11.634 0.175594 12.058 0 12.5 0C12.942 0 13.3659 0.175594 13.6785 0.488155C13.9911 0.800716 14.1667 1.22464 14.1667 1.66667V3.33333" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </button>

                {!isEditingBasicInfo && (
                  <button
                    onClick={handleEditBasicInfo}
                    className="shadow-theme-xs flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                    title="사이트 정보 수정"
                  >
                    <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill=""></path>
                    </svg>
                  </button>
                )}
              </div>
            </div>

          </div>
        </ComponentCard>

        {/* 사이트 운영 정보 */}
        <ComponentCard title="사이트 운영 정보">
          {siteInfo ? (
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                    운영 정보
                  </h4>
                  {!isEditingSiteInfo && (
                    <button
                      onClick={handleEditSiteInfo}
                      className="shadow-theme-xs flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200"
                      title="운영 정보 수정"
                    >
                      <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill=""></path>
                      </svg>
                    </button>
                  )}
                </div>

                {isEditingSiteInfo ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          최소 입금액 (원)
                        </label>
                        <input
                          type="number"
                          value={siteInfoForm.deposit_min}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, deposit_min: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="최소 입금액"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          첫 충전 보너스 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={siteInfoForm.first_bonus}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, first_bonus: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="첫 충전 보너스"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          매 충전 보너스 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={siteInfoForm.repeat_bonus}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, repeat_bonus: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="매 충전 보너스"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          카지노 페이백 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={siteInfoForm.casino_payback}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, casino_payback: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="카지노 페이백"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          슬롯 페이백 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={siteInfoForm.slot_payback}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, slot_payback: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="슬롯 페이백"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          롤링 비율 (%)
                        </label>
                        <input
                          type="number"
                          step="0.1"
                          value={siteInfoForm.rolling_rate}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, rolling_rate: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="롤링 비율"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          베팅 최소 금액 (원)
                        </label>
                        <input
                          type="number"
                          value={siteInfoForm.bet_limit_min}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, bet_limit_min: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="베팅 최소 금액"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          베팅 최대 금액 (원)
                        </label>
                        <input
                          type="number"
                          value={siteInfoForm.bet_limit_max}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, bet_limit_max: Number(e.target.value) })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="베팅 최대 금액"
                        />
                      </div>

                      <div className="lg:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          사이트 특징
                        </label>
                        <textarea
                          value={siteInfoForm.site_feature}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, site_feature: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="사이트 특징을 입력하세요"
                          rows={3}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          입금 방법
                        </label>
                        <input
                          type="text"
                          value={siteInfoForm.deposit_method}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, deposit_method: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="입금 방법"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          출금 방법
                        </label>
                        <input
                          type="text"
                          value={siteInfoForm.withdrawal_method}
                          onChange={(e) => setSiteInfoForm({ ...siteInfoForm, withdrawal_method: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                          placeholder="출금 방법"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <button
                        onClick={handleSaveSiteInfo}
                        disabled={updateSiteInfoMutation.isPending}
                        className="px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md transition-colors disabled:opacity-50"
                      >
                        {updateSiteInfoMutation.isPending ? '저장 중...' : '저장'}
                      </button>
                      <button
                        onClick={handleCancelSiteInfoEdit}
                        className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded-md transition-colors"
                      >
                        취소
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      최소 입금액
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.deposit_min?.toLocaleString()}원
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      첫 충전 보너스
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.first_bonus}%
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      매 충전 보너스
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.repeat_bonus}%
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      카지노 페이백
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.casino_payback}%
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      슬롯 페이백
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.slot_payback}%
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      롤링 비율
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.rolling_rate}%
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      베팅 최소 금액
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.bet_limit_min?.toLocaleString()}원
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      베팅 최대 금액
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.bet_limit_max?.toLocaleString()}원
                    </p>
                  </div>

                  <div className="lg:col-span-2">
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      사이트 특징
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.site_feature || '없음'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      입금 방법
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.deposit_method || '없음'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      출금 방법
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.withdrawal_method || '없음'}
                    </p>
                  </div>

                  <div>
                    <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                      가상화폐 지원
                    </p>
                    <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                      {siteInfo.deposit_method?.includes('가상화폐') || siteInfo.withdrawal_method?.includes('가상화폐') ? '지원' : '미지원'}
                    </p>
                  </div>
                </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-500 dark:text-gray-400 mb-4">
                <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-lg font-medium text-gray-600 dark:text-gray-300">운영 정보가 없습니다</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">이 사이트의 상세 운영 정보가 등록되지 않았습니다.</p>
              </div>
              <button
                onClick={() => navigate('/site-management')}
                className="shadow-theme-xs flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 mx-auto"
              >
                <svg className="fill-current" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z" fill=""></path>
                </svg>
                운영 정보 등록
              </button>
            </div>
          )}
        </ComponentCard>

        {/* 사이트 입플 정보 */}
        <ComponentCard title="사이트 입플 정보">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  프로모션 목록
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    총 {promotions.length}개
                  </span>
                  <button
                    onClick={() => setIsAddingPromotion(true)}
                    className="px-3 py-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md transition-colors"
                  >
                    + 추가
                  </button>
                </div>
              </div>

                  {promotions.length > 0 || isAddingPromotion || editingPromotion ? (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-gray-200 dark:border-gray-700">
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                              순서
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                              프로모션명
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                              타입
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                              충전금액
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                              보너스 조건
                            </th>
                            <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                              상태
                            </th>
                            <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                              액션
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* 추가 모드 행 */}
                          {isAddingPromotion && (
                            <tr className="border-b border-gray-100 dark:border-gray-800 bg-blue-50 dark:bg-blue-900/20">
                              <td className="py-3 px-4">
                                <input
                                  type="number"
                                  value={promotionForm.display_order}
                                  onChange={(e) => setPromotionForm({ ...promotionForm, display_order: Number(e.target.value) })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  placeholder="순서"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <input
                                  type="text"
                                  value={promotionForm.promotion_name}
                                  onChange={(e) => setPromotionForm({ ...promotionForm, promotion_name: e.target.value })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                  placeholder="프로모션명"
                                />
                              </td>
                              <td className="py-3 px-4">
                                <select
                                  value={promotionForm.deposit_type}
                                  onChange={(e) => setPromotionForm({ ...promotionForm, deposit_type: e.target.value as any })}
                                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                >
                                  <option value="first">첫 충전</option>
                                  <option value="repeat">매 충전</option>
                                  <option value="daily">일일</option>
                                  <option value="weekly">주간</option>
                                  <option value="monthly">월간</option>
                                  <option value="special">특별</option>
                                </select>
                              </td>
                              <td className="py-3 px-4">
                                <div className="flex gap-1">
                                  <input
                                    type="number"
                                    value={promotionForm.min_deposit}
                                    onChange={(e) => setPromotionForm({ ...promotionForm, min_deposit: Number(e.target.value) })}
                                    className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    placeholder="충전금액"
                                  />
                                  <span className="text-xs text-gray-500 dark:text-gray-400 self-center">원</span>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <div className="space-y-2">
                                  <div className="flex gap-1">
                                    <input
                                      type="number"
                                      step="0.1"
                                      value={promotionForm.bonus_rate}
                                      onChange={(e) => setPromotionForm({ ...promotionForm, bonus_rate: Number(e.target.value) })}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                      placeholder="보너스%"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 self-center">%</span>
                                  </div>
                                  <div className="flex gap-1">
                                    <input
                                      type="number"
                                      value={promotionForm.bonus_amount}
                                      onChange={(e) => setPromotionForm({ ...promotionForm, bonus_amount: Number(e.target.value) })}
                                      className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                      placeholder="고정보너스"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 self-center">원</span>
                                  </div>
                                </div>
                              </td>
                              <td className="py-3 px-4">
                                <label className="flex items-center gap-1">
                                  <input
                                    type="checkbox"
                                    checked={promotionForm.is_active}
                                    onChange={(e) => setPromotionForm({ ...promotionForm, is_active: e.target.checked })}
                                    className="rounded"
                                  />
                                  <span className="text-xs">활성</span>
                                </label>
                              </td>
                              <td className="py-3 px-4 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={handleAddPromotion}
                                    disabled={addPromotionMutation.isPending}
                                    className="px-2 py-1 text-xs font-medium text-white bg-green-500 hover:bg-green-600 rounded transition-colors disabled:opacity-50"
                                  >
                                    저장
                                  </button>
                                  <button
                                    onClick={handleCancelEdit}
                                    className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                                  >
                                    취소
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* 기존 프로모션 행들 */}
                          {promotions
                            .sort((a, b) => a.display_order - b.display_order)
                            .map((promotion) => (
                            <tr key={promotion.promotion_seq} className="border-b border-gray-100 dark:border-gray-800">
                              {editingPromotion === promotion.promotion_seq ? (
                                // 수정 모드 행
                                <>
                                  <td className="py-3 px-4">
                                    <input
                                      type="number"
                                      value={promotionForm.display_order}
                                      onChange={(e) => setPromotionForm({ ...promotionForm, display_order: Number(e.target.value) })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <input
                                      type="text"
                                      value={promotionForm.promotion_name}
                                      onChange={(e) => setPromotionForm({ ...promotionForm, promotion_name: e.target.value })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    />
                                  </td>
                                  <td className="py-3 px-4">
                                    <select
                                      value={promotionForm.deposit_type}
                                      onChange={(e) => setPromotionForm({ ...promotionForm, deposit_type: e.target.value as any })}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                    >
                                      <option value="first">첫 충전</option>
                                      <option value="repeat">매 충전</option>
                                      <option value="daily">일일</option>
                                      <option value="weekly">주간</option>
                                      <option value="monthly">월간</option>
                                      <option value="special">특별</option>
                                    </select>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="flex gap-1">
                                      <input
                                        type="number"
                                        value={promotionForm.min_deposit}
                                        onChange={(e) => setPromotionForm({ ...promotionForm, min_deposit: Number(e.target.value) })}
                                        className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="충전금액"
                                      />
                                      <span className="text-xs text-gray-500 dark:text-gray-400 self-center">원</span>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <div className="space-y-2">
                                      <div className="flex gap-1">
                                        <input
                                          type="number"
                                          step="0.1"
                                          value={promotionForm.bonus_rate}
                                          onChange={(e) => setPromotionForm({ ...promotionForm, bonus_rate: Number(e.target.value) })}
                                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                          placeholder="보너스%"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 self-center">%</span>
                                      </div>
                                      <div className="flex gap-1">
                                        <input
                                          type="number"
                                          value={promotionForm.bonus_amount}
                                          onChange={(e) => setPromotionForm({ ...promotionForm, bonus_amount: Number(e.target.value) })}
                                          className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                          placeholder="고정보너스"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 self-center">원</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <label className="flex items-center gap-1">
                                      <input
                                        type="checkbox"
                                        checked={promotionForm.is_active}
                                        onChange={(e) => setPromotionForm({ ...promotionForm, is_active: e.target.checked })}
                                        className="rounded"
                                      />
                                      <span className="text-xs">활성</span>
                                    </label>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-1">
                                      <button
                                        onClick={handleUpdatePromotion}
                                        disabled={updatePromotionMutation.isPending}
                                        className="px-2 py-1 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded transition-colors disabled:opacity-50"
                                      >
                                        저장
                                      </button>
                                      <button
                                        onClick={handleCancelEdit}
                                        className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 rounded transition-colors"
                                      >
                                        취소
                                      </button>
                                    </div>
                                  </td>
                                </>
                              ) : (
                                // 읽기 모드 행
                                <>
                                  <td className="py-3 px-4 text-sm text-gray-800 dark:text-white/90">
                                    {promotion.display_order}
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-800 dark:text-white/90">
                                    {promotion.promotion_name}
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPromotionTypeBadgeColor(promotion.deposit_type)}`}>
                                      {getPromotionTypeLabel(promotion.deposit_type)}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-800 dark:text-white/90">
                                    <div className="font-medium">
                                      {promotion.min_deposit === 0 ? '제한없음' : `${promotion.min_deposit.toLocaleString()}원`}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4 text-sm text-gray-800 dark:text-white/90">
                                    <div className="space-y-1">
                                      {promotion.bonus_rate > 0 && (
                                        <div className="text-xs">
                                          <span className="font-medium text-brand-600 dark:text-brand-400">{promotion.bonus_rate}%</span>
                                          <span className="text-gray-500 dark:text-gray-400"> 보너스</span>
                                        </div>
                                      )}
                                      {promotion.bonus_amount > 0 && (
                                        <div className="text-xs">
                                          <span className="font-medium text-green-600 dark:text-green-400">+{promotion.bonus_amount.toLocaleString()}원</span>
                                          <span className="text-gray-500 dark:text-gray-400"> 고정보너스</span>
                                        </div>
                                      )}
                                    </div>
                                  </td>
                                  <td className="py-3 px-4">
                                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${promotion.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400' : 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400'}`}>
                                      {promotion.is_active ? '활성' : '비활성'}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <div className="flex items-center justify-center gap-2">
                                      <button
                                        onClick={() => handleEditPromotion(promotion)}
                                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                        title="수정"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeletePromotion(promotion.promotion_seq)}
                                        className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                        title="삭제"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                    </svg>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-300">입플 정보가 없습니다</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">이 사이트의 입금 프로모션 정보가 등록되지 않았습니다.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ComponentCard>

        {/* 사이트 이벤트 정보 */}
        <ComponentCard title="사이트 이벤트 정보">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90">
                  이벤트 목록
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    총 {events.length}개
                  </span>
                  <button
                    onClick={() => handleOpenEventModal()}
                    className="px-3 py-1 text-xs font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-md transition-colors"
                  >
                    + 이벤트 추가
                  </button>
                </div>
              </div>

              {events.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-gray-700">
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          순서
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          이벤트명
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          타입
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          상태
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          기간
                        </th>
                        <th className="text-left py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          추천
                        </th>
                        <th className="text-center py-3 px-4 text-xs font-medium text-gray-500 dark:text-gray-400">
                          액션
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.map((event) => (
                        <tr key={event.site_event_seq} className="border-b border-gray-100 dark:border-gray-800">
                          <td className="py-3 px-4 text-sm text-gray-800 dark:text-white/90">
                            {event.display_order}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-800 dark:text-white/90">
                            <div>
                              <div className="font-medium">{event.name}</div>
                              {event.description && (
                                <div 
                                  className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2"
                                  dangerouslySetInnerHTML={{ 
                                    __html: event.description.length > 100 
                                      ? `${event.description.substring(0, 100)}...` 
                                      : event.description 
                                  }}
                                />
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventTypeBadgeColor(event.event_type)}`}>
                              {getEventTypeLabel(event.event_type)}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEventStatusBadgeColor(event.status)}`}>
                              {getEventStatusLabel(event.status)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-800 dark:text-white/90">
                            <div className="text-xs">
                              <div>
                                {event.start_date 
                                  ? new Date(event.start_date).toLocaleDateString() 
                                  : <span className="text-brand-500 font-medium">상시 진행</span>
                                }
                              </div>
                              <div className="text-gray-500 dark:text-gray-400">~</div>
                              <div>
                                {event.end_date 
                                  ? new Date(event.end_date).toLocaleDateString() 
                                  : <span className="text-brand-500 font-medium">종료 기한 없음</span>
                                }
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            {event.is_featured ? (
                              <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                추천
                              </span>
                            ) : (
                              <span className="text-xs text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleOpenEventModal(event)}
                                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                title="수정"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteEvent(event.site_event_seq)}
                                className="p-1 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                title="삭제"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-gray-500 dark:text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 7V3a2 2 0 012-2h4a2 2 0 012 2v4m-6 0V7a2 2 0 012-2h4a2 2 0 012 2v0M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V9a2 2 0 00-2-2h-2" />
                    </svg>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-300">이벤트 정보가 없습니다</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">이 사이트의 이벤트 정보가 등록되지 않았습니다.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </ComponentCard>

        {/* 이벤트 등록/수정 모달 */}
        <SiteEventModal
          isOpen={isEventModalOpen}
          onClose={handleCloseEventModal}
          siteSeq={siteSeq!}
          event={editingEvent}
          isEditing={!!editingEvent}
        />

        {/* 사이트 통계 정보 */}
        <ComponentCard title="사이트 통계">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <h4 className="text-lg font-semibold text-gray-800 lg:mb-6 dark:text-white/90">
                운영 통계
              </h4>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-7 2xl:gap-x-32">
                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    구독자 수
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {site.subscriber_count?.toLocaleString()}명
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    조회수
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {site.view_count?.toLocaleString()}회
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    평균 평점
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {site.avg_rating?.toFixed(1)}점
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    추천 여부
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {site.is_recommend ? '추천 사이트' : '일반 사이트'}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    등록일
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {new Date(site.created_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>

                <div>
                  <p className="mb-2 text-xs leading-normal text-gray-500 dark:text-gray-400">
                    수정일
                  </p>
                  <p className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {new Date(site.updated_at).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}
