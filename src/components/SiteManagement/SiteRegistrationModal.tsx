import { useState } from "react";
import { toast } from 'react-toastify';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SiteRegistrationData, SitePromotionFormData } from "../../types/site";
import { createSiteWithDetails } from "../../services/site";
import { ImageUpload } from '../common/ImageUpload';
import Label from '../form/Label';

interface SiteRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SiteRegistrationModal = ({ isOpen, onClose }: SiteRegistrationModalProps) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<'basic' | 'details' | 'promotions' | 'images'>('basic');
  
  const [formData, setFormData] = useState<SiteRegistrationData>({
    // 기본 정보
    name: '',
    url: '',
    type: 'sports',
    status: 'active',
    
    // 상세 정보
    deposit_min: 0,
    first_bonus: 0,
    daily_repeat_bonus: 0,
    casino_payback: 0,
    slot_payback: 0,
    rolling_rate: 0,
    bet_limit_min: 0,
    bet_limit_max: 0,
    site_feature: '',
    is_crypto: false,
    daily_first_bonus: 0,
    slot_comp: 0,
    casino_comp: 0,
    casino_bonus: 0,
    slot_bonus: 0,
    sport_bonus: 0,
    sport_payback: 0,
    
    // 입플 정보
    promotions: [{
      bonus_rate: 0,
      bonus_amount: 0,
    }],
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 이미지 관련 상태
  const [logoImage, setLogoImage] = useState<string | null>(null);
  const [logoImageUrl, setLogoImageUrl] = useState<string | null>(null);

  // 사이트 생성 mutation
  const createSiteMutation = useMutation({
    mutationFn: (siteData: SiteRegistrationData) => createSiteWithDetails(siteData),
    onSuccess: () => {
      toast.success("사이트가 성공적으로 등록되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      queryClient.invalidateQueries({ queryKey: ['siteCounts'] });
      handleClose();
    },
    onError: (error) => {
      toast.error(`사이트 등록에 실패했습니다: ${error.message}`);
    },
  });

  const handleClose = () => {
    setFormData({
      name: '',
      url: '',
      type: 'sports',
      status: 'active',
      deposit_min: 0,
      first_bonus: 0,
      daily_repeat_bonus: 0,
      casino_payback: 0,
      slot_payback: 0,
      rolling_rate: 0,
      bet_limit_min: 0,
      bet_limit_max: 0,
      site_feature: '',
      is_crypto: false,
      daily_first_bonus: 0,
      slot_comp: 0,
      casino_comp: 0,
      casino_bonus: 0,
      slot_bonus: 0,
      sport_bonus: 0,
      sport_payback: 0,
      promotions: [{
        bonus_rate: 0,
        bonus_amount: 0,
      }],
    });
    setErrors({});
    setLogoImage(null);
    setLogoImageUrl(null);
    setCurrentStep('basic');
    onClose();
  };

  const validateStep = (step: string): boolean => {
    const newErrors: Record<string, string> = {};

        if (step === 'basic') {
          if (!formData.name.trim()) {
            newErrors.name = '사이트 이름은 필수입니다.';
          }
          if (!formData.url.trim()) {
            newErrors.url = '사이트 URL은 필수입니다.';
          } else {
            const urlPattern = /^https?:\/\/.+/;
            if (!urlPattern.test(formData.url)) {
              newErrors.url = '올바른 URL 형식을 입력해주세요. (http:// 또는 https://로 시작)';
            }
          }
        } else if (step === 'details') {
      // 상세 정보 검증 (필수 항목이 없으므로 기본 검증만)
      if (formData.deposit_min < 0) {
        newErrors.deposit_min = '보증금은 0 이상이어야 합니다.';
      }
      if (formData.bet_limit_min < 0) {
        newErrors.bet_limit_min = '베팅 최소 금액은 0 이상이어야 합니다.';
      }
      if (formData.bet_limit_max < 0) {
        newErrors.bet_limit_max = '베팅 최대 금액은 0 이상이어야 합니다.';
      }
      if (formData.bet_limit_max > 0 && formData.bet_limit_min > 0 && formData.bet_limit_max < formData.bet_limit_min) {
        newErrors.bet_limit_max = '베팅 최대 금액은 최소 금액보다 커야 합니다.';
      }
    } else if (step === 'promotions') {
      // 입플 정보 검증
      if (formData.promotions.length === 0) {
        newErrors.promotions = '최소 하나의 입플 정보가 필요합니다.';
      } else {
        formData.promotions.forEach((promotion, index) => {
          if (promotion.bonus_rate < 0) {
            newErrors[`promotion_${index}_bonus_rate`] = '보너스 비율은 0 이상이어야 합니다.';
          }
          if (promotion.bonus_amount < 0) {
            newErrors[`promotion_${index}_bonus_amount`] = '보너스 금액은 0 이상이어야 합니다.';
          }
        });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (currentStep === 'basic') {
      if (validateStep('basic')) {
        setCurrentStep('details');
      }
    } else if (currentStep === 'details') {
      if (validateStep('details')) {
        setCurrentStep('promotions');
      }
    } else if (currentStep === 'promotions') {
      if (validateStep('promotions')) {
        setCurrentStep('images');
      }
    }
  };

  const handlePrev = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
    }
    
    if (currentStep === 'details') {
      setCurrentStep('basic');
    } else if (currentStep === 'promotions') {
      setCurrentStep('details');
    } else if (currentStep === 'images') {
      setCurrentStep('promotions');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 4단계에서만 실제 등록 실행
    if (currentStep === 'images') {
      // 모든 단계 검증
      if (!validateStep('basic') || !validateStep('details') || !validateStep('promotions')) {
        return;
      }

      // 로고 이미지 정보를 포함하여 사이트 등록
      const siteDataWithLogo = {
        ...formData,
        logo_image: logoImage
      };

      createSiteMutation.mutate(siteDataWithLogo);
    }
  };

  const handleInputChange = (field: keyof SiteRegistrationData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // 에러 초기화
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePromotionChange = (index: number, field: keyof SitePromotionFormData, value: any) => {
    const newPromotions = [...formData.promotions];
    newPromotions[index] = {
      ...newPromotions[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      promotions: newPromotions
    }));
  };

  const addPromotion = () => {
    setFormData(prev => ({
      ...prev,
      promotions: [...prev.promotions, {
        bonus_rate: 0,
        bonus_amount: 0,
      }]
    }));
  };

  const removePromotion = (index: number) => {
    if (formData.promotions.length > 1) {
      setFormData(prev => ({
        ...prev,
        promotions: prev.promotions.filter((_, i) => i !== index)
      }));
    }
  };

  // 이미지 핸들러 함수들
  const handleLogoUpload = (fileSeq: string, fileUrl: string) => {
    setLogoImage(fileSeq);
    setLogoImageUrl(fileUrl);
  };

  const handleLogoRemove = () => {
    setLogoImage(null);
    setLogoImageUrl(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 오버레이 */}
      <div 
        className="absolute inset-0 bg-white bg-opacity-50 dark:bg-black dark:bg-opacity-70"
        onClick={handleClose}
      />
      
      {/* 모달 컨텐츠 */}
      <div className="relative w-full max-w-4xl mx-4 bg-white rounded-xl shadow-xl dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              사이트 등록
            </h2>
            <div className="flex items-center mt-2 space-x-4">
              <div className={`flex items-center ${currentStep === 'basic' ? 'text-brand-500' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'basic' ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  1
                </div>
                <span className="ml-2 text-sm">기본 정보</span>
              </div>
              <div className={`flex items-center ${currentStep === 'details' ? 'text-brand-500' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'details' ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  2
                </div>
                <span className="ml-2 text-sm">상세 정보</span>
              </div>
              <div className={`flex items-center ${currentStep === 'promotions' ? 'text-brand-500' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'promotions' ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
                <span className="ml-2 text-sm">입플 정보</span>
              </div>
              <div className={`flex items-center ${currentStep === 'images' ? 'text-brand-500' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'images' ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  4
                </div>
                <span className="ml-2 text-sm">이미지 등록</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* 1단계: 기본 정보 */}
          {currentStep === 'basic' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">기본 정보</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* 사이트 이름 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    사이트 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="사이트 이름"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* 사이트 URL */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    사이트 URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) => handleInputChange('url', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.url ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="https://example.com"
                  />
                  {errors.url && (
                    <p className="mt-1 text-sm text-red-500">{errors.url}</p>
                  )}
                </div>

                {/* 사이트 타입 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    사이트 타입
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => handleInputChange('type', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="casino">카지노</option>
                    <option value="sports">스포츠</option>
                    <option value="holdem">홀덤</option>
                    <option value="sport">스포츠</option>
                    <option value="mixed">혼합</option>
                  </select>
                </div>

                {/* 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    상태
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="active">운영중</option>
                    <option value="suspended">일시중단</option>
                    <option value="closed">폐쇄</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* 2단계: 상세 정보 */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">상세 정보</h3>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* 보증금 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    보증금 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.deposit_min}
                    onChange={(e) => handleInputChange('deposit_min', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 가입 첫 충전 보너스 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    가입 첫 충전 보너스 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.first_bonus}
                    onChange={(e) => handleInputChange('first_bonus', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 매일 첫 충전 보너스 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    매일 첫 충전 보너스 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.daily_first_bonus}
                    onChange={(e) => handleInputChange('daily_first_bonus', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 매일 매 충전 보너스 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    매일 매 충전 보너스 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.daily_repeat_bonus}
                    onChange={(e) => handleInputChange('daily_repeat_bonus', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 카지노 페이백 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카지노 페이백 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.casino_payback}
                    onChange={(e) => handleInputChange('casino_payback', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 슬롯 페이백 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    슬롯 페이백 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.slot_payback}
                    onChange={(e) => handleInputChange('slot_payback', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 롤링 비율 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    롤링 비율 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.rolling_rate}
                    onChange={(e) => handleInputChange('rolling_rate', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 베팅 최소 금액 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    베팅 최소 금액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bet_limit_min}
                    onChange={(e) => handleInputChange('bet_limit_min', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 베팅 최대 금액 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    베팅 최대 금액 (원)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.bet_limit_max}
                    onChange={(e) => handleInputChange('bet_limit_max', parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 사이트 특징 */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    사이트 특징
                  </label>
                  <textarea
                    value={formData.site_feature}
                    onChange={(e) => handleInputChange('site_feature', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="사이트의 주요 특징을 입력하세요"
                  />
                </div>

                {/* 가상화폐 지원 여부 */}
                <div className="sm:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_crypto || false}
                      onChange={(e) => handleInputChange('is_crypto', e.target.checked)}
                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      가상화폐 입출금 지원
                    </span>
                  </label>
                </div>

                {/* 슬릇 콤프 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    슬릇 콤프 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.slot_comp}
                    onChange={(e) => handleInputChange('slot_comp', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 카지노 콤프 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카지노 콤프 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.casino_comp}
                    onChange={(e) => handleInputChange('casino_comp', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 카지노 충전 보너스 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    카지노 충전 보너스 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.casino_bonus}
                    onChange={(e) => handleInputChange('casino_bonus', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 슬릇 충전 보너스 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    슬릇 충전 보너스 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.slot_bonus}
                    onChange={(e) => handleInputChange('slot_bonus', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 스포츠 충전 보너스 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    스포츠 충전 보너스 (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sport_bonus}
                    onChange={(e) => handleInputChange('sport_bonus', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                {/* 스포츠 페이백 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    스포츠 페이백 (낙첨) (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.sport_payback}
                    onChange={(e) => handleInputChange('sport_payback', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 3단계: 입플 정보 */}
          {currentStep === 'promotions' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">입플 정보</h3>
                <button
                  type="button"
                  onClick={addPromotion}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-brand-500 border border-brand-500 rounded-lg hover:bg-brand-50 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  입플 추가
                </button>
              </div>

              <div className="space-y-4">
                {formData.promotions.map((promotion, index) => (
                  <div key={index} className="p-4 border border-gray-200 rounded-lg dark:border-gray-700">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        입플 #{index + 1}
                      </h4>
                      {formData.promotions.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removePromotion(index)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* 보너스 비율 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          보너스 비율 (예: 3+2에서 3)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={promotion.bonus_rate}
                          onChange={(e) => handlePromotionChange(index, 'bonus_rate', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      {/* 보너스 금액 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          보너스 금액 (예: 3+2에서 2)
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={promotion.bonus_amount}
                          onChange={(e) => handlePromotionChange(index, 'bonus_amount', parseInt(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4단계: 이미지 등록 */}
          {currentStep === 'images' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center">이미지 등록</h3>
              
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  {/* 로고 이미지 */}
                  <div>
                    <Label htmlFor="logo" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
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
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                      권장 크기: 200x200px, 최대 2MB
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-between pt-6 border-t border-gray-200 dark:border-gray-700">
            <div>
              {currentStep !== 'basic' && (
                <button
                  type="button"
                  onClick={(e) => handlePrev(e)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  이전
                </button>
              )}
            </div>
            
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                취소
              </button>
              
              {currentStep !== 'images' ? (
                <button
                  type="button"
                  onClick={(e) => handleNext(e)}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
                >
                  다음
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={createSiteMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {createSiteMutation.isPending ? '등록 중...' : '등록'}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};