import { useState, useEffect } from "react";
import { toast } from 'react-toastify';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import DatePicker from 'react-datepicker';
import { ko } from 'date-fns/locale';
import 'react-datepicker/dist/react-datepicker.css';
import './SiteEventModal.css';
import type { SiteEvent } from "../../types/site";
import { addSiteEvent, updateSiteEvent } from "../../services/site";
import { ImageUpload } from '../common/ImageUpload';
import RichTextEditor from '../common/RichTextEditor';
import Label from '../form/Label';

interface SiteEventModalProps {
  isOpen: boolean;
  onClose: () => void;
  siteSeq: string;
  event?: SiteEvent | null;
  isEditing?: boolean;
}

interface EventFormData {
  name: string;
  description: string;
  event_type: 'bonus' | 'cashback' | 'tournament' | 'special' | 'seasonal';
  status: 'before' | 'ongoing' | 'ended';
  start_date?: string;
  end_date?: string;
  is_featured: boolean;
  display_order: number;
  thumbnail_image?: string | null;
}

export const SiteEventModal = ({ isOpen, onClose, siteSeq, event, isEditing = false }: SiteEventModalProps) => {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState<'basic' | 'details' | 'images'>('basic');
  
  const [formData, setFormData] = useState<EventFormData>({
    name: '',
    description: '',
    event_type: 'bonus',
    status: 'before',
    start_date: '',
    end_date: '',
    is_featured: false,
    display_order: 1,
    thumbnail_image: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  
  // 이미지 관련 상태
  const [thumbnailImage, setThumbnailImage] = useState<string | null>(null);
  const [thumbnailImageUrl, setThumbnailImageUrl] = useState<string | null>(null);

  // 수정 모드일 때 기존 데이터 로드
  useEffect(() => {
    if (isEditing && event) {
      setFormData({
        name: event.name,
        description: event.description || '',
        event_type: event.event_type,
        status: event.status,
        start_date: event.start_date ? event.start_date.split('T')[0] : '',
        end_date: event.end_date ? event.end_date.split('T')[0] : '',
        is_featured: event.is_featured,
        display_order: event.display_order,
        thumbnail_image: null,
      });
    }
  }, [isEditing, event]);

  // 이벤트 추가 mutation
  const addEventMutation = useMutation({
    mutationFn: (eventData: Omit<SiteEvent, "site_event_seq" | "site_seq" | "created_at" | "updated_at" | "view_count">) =>
      addSiteEvent(siteSeq, eventData),
    onSuccess: () => {
      toast.success("이벤트가 성공적으로 추가되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['site-events', siteSeq] });
      handleClose();
    },
    onError: (error) => {
      toast.error(`이벤트 추가 실패: ${error.message}`);
    },
  });

  // 이벤트 수정 mutation
  const updateEventMutation = useMutation({
    mutationFn: (updates: Partial<Omit<SiteEvent, "site_event_seq" | "site_seq" | "created_at" | "updated_at">>) =>
      updateSiteEvent(event!.site_event_seq, updates),
    onSuccess: () => {
      toast.success("이벤트가 성공적으로 수정되었습니다.");
      queryClient.invalidateQueries({ queryKey: ['site-events', siteSeq] });
      handleClose();
    },
    onError: (error) => {
      toast.error(`이벤트 수정 실패: ${error.message}`);
    },
  });

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      event_type: 'bonus',
      status: 'before',
      start_date: '',
      end_date: '',
      is_featured: false,
      display_order: 1,
      thumbnail_image: null,
    });
    setErrors({});
    setThumbnailImage(null);
    setThumbnailImageUrl(null);
    setCurrentStep('basic');
    onClose();
  };

  const validateStep = (step: string): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 'basic') {
      if (!formData.name.trim()) {
        newErrors.name = '이벤트 이름은 필수입니다.';
      }
      // 시작일과 종료일이 모두 있는 경우에만 비교
      if (formData.start_date && formData.end_date && formData.start_date > formData.end_date) {
        newErrors.end_date = '종료일은 시작일보다 이후여야 합니다.';
      }
      if (formData.display_order < 1) {
        newErrors.display_order = '표시 순서는 1 이상이어야 합니다.';
      }
    } else if (step === 'details') {
      if (!formData.description.trim()) {
        newErrors.description = '이벤트 설명은 필수입니다.';
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
    } else if (currentStep === 'images') {
      setCurrentStep('details');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 3단계에서만 실제 등록/수정 실행
    if (currentStep === 'images') {
      // 모든 단계 검증
      if (!validateStep('basic') || !validateStep('details')) {
        return;
      }

      const eventData = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        event_type: formData.event_type,
        status: formData.status,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
        is_featured: formData.is_featured,
        display_order: formData.display_order,
        // TODO: 썸네일 이미지는 추후 구현
      };

      console.log('이벤트 등록 데이터:', eventData);

      if (isEditing && event) {
        updateEventMutation.mutate(eventData);
      } else {
        addEventMutation.mutate(eventData);
      }
    }
  };

  const handleInputChange = (field: keyof EventFormData, value: any) => {
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

  // 이미지 핸들러 함수들
  const handleThumbnailUpload = (fileSeq: string, fileUrl: string) => {
    setThumbnailImage(fileSeq);
    setThumbnailImageUrl(fileUrl);
  };

  const handleThumbnailRemove = () => {
    setThumbnailImage(null);
    setThumbnailImageUrl(null);
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
              {isEditing ? '이벤트 수정' : '이벤트 등록'}
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
                <span className="ml-2 text-sm">상세 내용</span>
              </div>
              <div className={`flex items-center ${currentStep === 'images' ? 'text-brand-500' : 'text-gray-400'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  currentStep === 'images' ? 'bg-brand-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  3
                </div>
                <span className="ml-2 text-sm">썸네일 등록</span>
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
                {/* 이벤트 이름 */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이벤트 이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.name ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="이벤트 이름을 입력하세요"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                {/* 이벤트 타입 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이벤트 타입 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => handleInputChange('event_type', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="bonus">보너스</option>
                    <option value="cashback">캐시백</option>
                    <option value="tournament">토너먼트</option>
                    <option value="special">특별</option>
                    <option value="seasonal">시즌</option>
                  </select>
                </div>

                {/* 이벤트 상태 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    이벤트 상태 <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="before">시작 전</option>
                    <option value="ongoing">진행중</option>
                    <option value="ended">종료</option>
                  </select>
                </div>

                {/* 시작일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    시작일 <span className="text-xs text-gray-500">(선택사항)</span>
                  </label>
                  <DatePicker
                    selected={formData.start_date ? new Date(formData.start_date) : null}
                    onChange={(date) => handleInputChange('start_date', date ? date.toISOString().split('T')[0] : '')}
                    dateFormat="yyyy-MM-dd"
                    locale={ko}
                    placeholderText="상시 진행"
                    isClearable
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.start_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    wrapperClassName="w-full"
                  />
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-500">{errors.start_date}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    비어있으면 "상시 진행"으로 표시됩니다
                  </p>
                </div>

                {/* 종료일 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    종료일 <span className="text-xs text-gray-500">(선택사항)</span>
                  </label>
                  <DatePicker
                    selected={formData.end_date ? new Date(formData.end_date) : null}
                    onChange={(date) => handleInputChange('end_date', date ? date.toISOString().split('T')[0] : '')}
                    dateFormat="yyyy-MM-dd"
                    locale={ko}
                    placeholderText="종료 기한 없음"
                    minDate={formData.start_date ? new Date(formData.start_date) : undefined}
                    isClearable
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.end_date ? 'border-red-500' : 'border-gray-300'
                    }`}
                    wrapperClassName="w-full"
                  />
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-500">{errors.end_date}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    비어있으면 "종료 기한 없음"으로 표시됩니다
                  </p>
                </div>

                {/* 표시 순서 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    표시 순서
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.display_order}
                    onChange={(e) => handleInputChange('display_order', parseInt(e.target.value) || 1)}
                    className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                      errors.display_order ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.display_order && (
                    <p className="mt-1 text-sm text-red-500">{errors.display_order}</p>
                  )}
                </div>

                {/* 추천 이벤트 여부 */}
                <div className="sm:col-span-2">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={formData.is_featured}
                      onChange={(e) => handleInputChange('is_featured', e.target.checked)}
                      className="rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      추천 이벤트
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 2단계: 상세 내용 */}
          {currentStep === 'details' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">상세 내용</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  이벤트 설명 <span className="text-red-500">*</span>
                </label>
                <RichTextEditor
                  value={formData.description}
                  onChange={(value) => handleInputChange('description', value)}
                  placeholder="이벤트 설명을 입력하세요..."
                />
                {errors.description && (
                  <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                )}
              </div>
            </div>
          )}

          {/* 3단계: 썸네일 등록 */}
          {currentStep === 'images' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white text-center">썸네일 등록</h3>
              
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <div>
                    <Label htmlFor="thumbnail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 text-center">
                      이벤트 썸네일
                    </Label>
                    <ImageUpload
                      onImageUpload={handleThumbnailUpload}
                      onImageRemove={handleThumbnailRemove}
                      currentImageUrl={thumbnailImageUrl || undefined}
                      currentFileSeq={thumbnailImage || undefined}
                      accept="image/*"
                      maxSize={2}
                      className="w-full"
                    />
                    <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 text-center">
                      권장 크기: 800x400px, 최대 2MB (선택사항)
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
                  disabled={addEventMutation.isPending || updateEventMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {(addEventMutation.isPending || updateEventMutation.isPending) ? '처리 중...' : (isEditing ? '수정' : '등록')}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

