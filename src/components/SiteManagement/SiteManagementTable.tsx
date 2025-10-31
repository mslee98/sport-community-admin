import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import Badge from "../ui/badge/Badge";
import Pagination from "../common/Pagination";
import LoadingSpinner from "../common/LoadingSpinner";
import type { Site, SiteFilter, UpdateSiteRequest } from "../../types/site";
import { fetchFilteredSites, updateSite, deleteSite } from "../../services/site";
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SiteRegistrationModal } from './SiteRegistrationModal';

export function SiteManagementTable() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [editingSite, setEditingSite] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<UpdateSiteRequest>({});
  
  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  
  // 필터링 및 검색 상태
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'suspended' | 'closed'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 필터 객체 생성
  const filter: SiteFilter = useMemo(() => {
    const filterObj: SiteFilter = {};
    
    // 상태 필터
    if (selectedFilter !== 'all') {
      filterObj.status = selectedFilter;
    }
    
    // 검색어 필터
    if (searchTerm.trim()) {
      filterObj.search = searchTerm.trim();
    }
    
    return filterObj;
  }, [selectedFilter, searchTerm]);

  // React Query로 필터링된 사이트 목록 불러오기 (서버 사이드 페이지네이션)
  const { 
    data: queryResult, 
    isLoading: loading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['sites', filter, currentPage, pageSize],
    queryFn: async () => {
      const { data, totalCount, error } = await fetchFilteredSites(filter, currentPage, pageSize);
      if (error) throw error;
      return { sites: data || [], totalCount };
    },
    placeholderData: (previousData) => previousData, // 페이지 변경 시 이전 데이터 유지
  });

  const sites = queryResult?.sites || [];
  const totalCount = queryResult?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 각 필터별 사이트 수 계산 (별도 쿼리로 최적화 가능)
  const { data: countData } = useQuery({
    queryKey: ['siteCounts'],
    queryFn: async () => {
      const [allResult, activeResult, suspendedResult, closedResult] = await Promise.all([
        fetchFilteredSites({}),
        fetchFilteredSites({ status: 'active' }),
        fetchFilteredSites({ status: 'suspended' }),
        fetchFilteredSites({ status: 'closed' })
      ]);
      
      return {
        allCount: allResult.totalCount,
        activeCount: activeResult.totalCount,
        suspendedCount: suspendedResult.totalCount,
        closedCount: closedResult.totalCount
      };
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  const siteCounts = countData || { allCount: 0, activeCount: 0, suspendedCount: 0, closedCount: 0 };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 편집 상태 초기화
    setEditingSite(null);
    setEditValues({});
  };

  // 필터 변경 핸들러
  const handleFilterChange = (filter: 'all' | 'active' | 'suspended' | 'closed') => {
    setSelectedFilter(filter);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // 검색 핸들러
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  // 사이트 정보 수정 mutation
  const updateSiteMutation = useMutation({
    mutationFn: ({ siteSeq, updates }: { siteSeq: string; updates: UpdateSiteRequest }) =>
      updateSite(siteSeq, updates),
    onSuccess: async (response) => {
      if (response.data) {
        // 모든 사이트 관련 쿼리 무효화 및 즉시 refetch
        await queryClient.invalidateQueries({ queryKey: ['sites'] });
        await queryClient.invalidateQueries({ queryKey: ['siteCounts'] });
        
        // 현재 쿼리도 즉시 refetch
        await refetch();
        
        toast.success("사이트 정보가 저장되었습니다.");
        setEditingSite(null);
        setEditValues({});
      }
    },
    onError: (error) => {
      toast.error(`사이트 정보 저장에 실패했습니다: ${error.message}`);
    },
  });

  // 사이트 삭제 mutation
  const deleteSiteMutation = useMutation({
    mutationFn: (siteSeq: string) => deleteSite(siteSeq),
    onSuccess: async () => {
      // 모든 사이트 관련 쿼리 무효화 및 즉시 refetch
      await queryClient.invalidateQueries({ queryKey: ['sites'] });
      await queryClient.invalidateQueries({ queryKey: ['siteCounts'] });
      
      // 현재 쿼리도 즉시 refetch
      await refetch();
      
      toast.success("사이트가 삭제되었습니다.");
    },
    onError: (error) => {
      toast.error(`사이트 삭제에 실패했습니다: ${error.message}`);
    },
  });

  // 편집 시작 핸들러
  const handleEdit = (site: Site) => {
    setEditingSite(site.site_seq);
    setEditValues({
      name: site.name,
      url: site.url,
      type: site.type,
      is_recommend: site.is_recommend,
      recommend_order: site.recommend_order,
      status: site.status,
      subscriber_count: site.subscriber_count,
      view_count: site.view_count,
      avg_rating: site.avg_rating,
    });
  };

  // 저장 핸들러
  const handleSave = (siteSeq: string) => {
    updateSiteMutation.mutate({ siteSeq, updates: editValues });
  };

  // 취소 핸들러
  const handleCancel = () => {
    setEditingSite(null);
    setEditValues({});
  };

  // 삭제 핸들러
  const handleDelete = (siteSeq: string) => {
    if (window.confirm('정말로 이 사이트를 삭제하시겠습니까?')) {
      deleteSiteMutation.mutate(siteSeq);
    }
  };

  // 상태 배지 색상 함수
  const getStatusBadgeColor = (status: Site['status']) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'suspended':
        return 'warning';
      case 'closed':
        return 'error';
      default:
        return 'info';
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

  // 타입 배지 색상 함수
  const getTypeBadgeColor = (type: Site['type']) => {
    switch (type) {
      case 'casino':
        return 'error';
      case 'sports':
        return 'success';
      case 'holdem':
        return 'warning';
      case 'sport':
        return 'info';
      case 'mixed':
        return 'info';
      default:
        return 'info';
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

  // 로딩 상태
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <LoadingSpinner size="md" />
          <p className="mt-4 text-gray-500 dark:text-gray-400">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 상태
  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-error-500 font-medium">데이터를 불러오는데 실패했습니다.</p>
          <p className="mt-2 text-gray-500 dark:text-gray-400">{(error as Error).message}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 text-sm font-medium text-white bg-brand-500 rounded-lg hover:bg-brand-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (sites.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
        {/* 상단 컨트롤 */}
        <div className="flex flex-col items-center px-4 py-5 xl:px-6 xl:py-6">
          <div className="flex flex-col w-full gap-5 sm:justify-between xl:flex-row xl:items-center">
            {/* 탭 메뉴 */}
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
              <button
                onClick={() => handleFilterChange('all')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                  selectedFilter === 'all' 
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                전체 사이트
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                  selectedFilter === 'all' 
                    ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                    : 'bg-white dark:bg-white/[0.03]'
                }`}>
                  {siteCounts.allCount}
                </span>
              </button>

              <button
                onClick={() => handleFilterChange('active')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                  selectedFilter === 'active' 
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                운영중 사이트
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                  selectedFilter === 'active' 
                    ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                    : 'bg-white dark:bg-white/[0.03]'
                }`}>
                  {siteCounts.activeCount}
                </span>
              </button>

              <button
                onClick={() => handleFilterChange('suspended')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                  selectedFilter === 'suspended' 
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                일시중단 사이트
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                  selectedFilter === 'suspended' 
                    ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                    : 'bg-white dark:bg-white/[0.03]'
                }`}>
                  {siteCounts.suspendedCount}
                </span>
              </button>

              <button
                onClick={() => handleFilterChange('closed')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                  selectedFilter === 'closed' 
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                폐쇄 사이트
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                  selectedFilter === 'closed' 
                    ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                    : 'bg-white dark:bg-white/[0.03]'
                }`}>
                  {siteCounts.closedCount}
                </span>
              </button>
            </div>

            {/* 검색 및 필터 버튼 */}
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              {/* 검색창 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="사이트 검색..."
                  value={searchTerm}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-64 px-4 py-2.5 pl-10 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
                <svg
                  className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]">
                <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12.0826 4.0835C11.0769 4.0835 10.2617 4.89871 10.2617 5.90433C10.2617 6.90995 11.0769 7.72516 12.0826 7.72516C13.0882 7.72516 13.9034 6.90995 13.9034 5.90433C13.9034 4.89871 13.0882 4.0835 12.0826 4.0835ZM2.29004 6.65409H8.84671C9.18662 8.12703 10.5063 9.22516 12.0826 9.22516C13.6588 9.22516 14.9785 8.12703 15.3184 6.65409H17.7067C18.1209 6.65409 18.4567 6.31831 18.4567 5.90409C18.4567 5.48988 18.1209 5.15409 17.7067 5.15409H15.3183C14.9782 3.68139 13.6586 2.5835 12.0826 2.5835C10.5065 2.5835 9.18691 3.68139 8.84682 5.15409H2.29004C1.87583 5.15409 1.54004 5.48988 1.54004 5.90409C1.54004 6.31831 1.87583 6.65409 2.29004 6.65409ZM4.6816 13.3462H2.29085C1.87664 13.3462 1.54085 13.682 1.54085 14.0962C1.54085 14.5104 1.87664 14.8462 2.29085 14.8462H4.68172C5.02181 16.3189 6.34142 17.4168 7.91745 17.4168C9.49348 17.4168 10.8131 16.3189 11.1532 14.8462H17.7075C18.1217 14.8462 18.4575 14.5104 18.4575 14.0962C18.4575 13.682 18.1217 13.3462 17.7075 13.3462H11.1533C10.8134 11.8733 9.49366 10.7752 7.91745 10.7752C6.34124 10.7752 5.02151 11.8733 4.6816 13.3462ZM9.73828 14.096C9.73828 13.0904 8.92307 12.2752 7.91745 12.2752C6.91183 12.2752 6.09662 13.0904 6.09662 14.096C6.09662 15.1016 6.91183 15.9168 7.91745 15.9168C8.92307 15.9168 9.73828 15.1016 9.73828 14.096Z" fill=""></path>
                </svg>
                필터 & 정렬
              </button>
            </div>
          </div>
        </div>

        {/* 빈 상태 메시지 */}
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-gray-500 dark:text-gray-400">
              {searchTerm ? '검색 결과가 없습니다.' : '해당 조건에 맞는 사이트가 없습니다.'}
            </p>
          </div>
        </div>

        {/* 하단 컨트롤 - 빈 상태일 때도 표시 */}
        <div className="relative flex flex-col items-center px-4 py-5 xl:px-6 xl:py-6">
          {/* 페이지네이션 - 빈 상태일 때는 숨김 */}
          <div className="flex justify-center w-full">
            {totalPages > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalCount}
                pageSize={pageSize}
                onPageChange={handlePageChange}
              />
            )}
          </div>

          {/* 등록 버튼 - 우측 절대 위치 */}
          <div className="absolute right-4 xl:right-6 top-1/2 -translate-y-1/2 mt-0 hidden sm:block">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors whitespace-nowrap"
            >
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 3C10.4142 3 10.75 3.33579 10.75 3.75V9.25H16.25C16.6642 9.25 17 9.58579 17 10C17 10.4142 16.6642 10.75 16.25 10.75H10.75V16.25C10.75 16.6642 10.4142 17 10 17C9.58579 17 9.25 16.6642 9.25 16.25V10.75H3.75C3.33579 10.75 3 10.4142 3 10C3 9.58579 3.33579 9.25 3.75 9.25H9.25V3.75C9.25 3.33579 9.58579 3 10 3Z"
                  fill="currentColor"
                />
              </svg>
              사이트 등록
            </button>
          </div>

          {/* 모바일용 등록 버튼 */}
          <div className="mt-4 sm:hidden w-full flex justify-center">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors whitespace-nowrap"
            >
              <svg
                className="fill-current"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  clipRule="evenodd"
                  d="M10 3C10.4142 3 10.75 3.33579 10.75 3.75V9.25H16.25C16.6642 9.25 17 9.58579 17 10C17 10.4142 16.6642 10.75 16.25 10.75H10.75V16.25C10.75 16.6642 10.4142 17 10 17C9.58579 17 9.25 16.6642 9.25 16.25V10.75H3.75C3.33579 10.75 3 10.4142 3 10C3 9.58579 3.33579 9.25 3.75 9.25H9.25V3.75C9.25 3.33579 9.58579 3 10 3Z"
                  fill="currentColor"
                />
              </svg>
              사이트 등록
            </button>
          </div>
        </div>

        {/* 사이트 등록 모달 */}
        <SiteRegistrationModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
      {/* 상단 컨트롤 */}
      <div className="flex flex-col items-center px-4 py-5 xl:px-6 xl:py-6">
        <div className="flex flex-col w-full gap-5 sm:justify-between xl:flex-row xl:items-center">
          {/* 탭 메뉴 */}
          <div className="flex flex-wrap items-center gap-x-1 gap-y-2 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            <button
              onClick={() => handleFilterChange('all')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                selectedFilter === 'all' 
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              전체 사이트
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                selectedFilter === 'all' 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                  : 'bg-white dark:bg-white/[0.03]'
              }`}>
                {siteCounts.allCount}
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('active')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                selectedFilter === 'active' 
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              운영중 사이트
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                selectedFilter === 'active' 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                  : 'bg-white dark:bg-white/[0.03]'
              }`}>
                {siteCounts.activeCount}
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('suspended')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                selectedFilter === 'suspended' 
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              일시중단 사이트
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                selectedFilter === 'suspended' 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                  : 'bg-white dark:bg-white/[0.03]'
              }`}>
                {siteCounts.suspendedCount}
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('closed')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                selectedFilter === 'closed' 
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              폐쇄 사이트
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                selectedFilter === 'closed' 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                  : 'bg-white dark:bg-white/[0.03]'
              }`}>
                {siteCounts.closedCount}
              </span>
            </button>
          </div>

          {/* 검색 및 필터 버튼 */}
          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            {/* 검색창 */}
            <div className="relative">
              <input
                type="text"
                placeholder="사이트 검색..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-64 px-4 py-2.5 pl-10 text-sm border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
              />
              <svg
                className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            <button className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-white/[0.03]">
              <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M12.0826 4.0835C11.0769 4.0835 10.2617 4.89871 10.2617 5.90433C10.2617 6.90995 11.0769 7.72516 12.0826 7.72516C13.0882 7.72516 13.9034 6.90995 13.9034 5.90433C13.9034 4.89871 13.0882 4.0835 12.0826 4.0835ZM2.29004 6.65409H8.84671C9.18662 8.12703 10.5063 9.22516 12.0826 9.22516C13.6588 9.22516 14.9785 8.12703 15.3184 6.65409H17.7067C18.1209 6.65409 18.4567 6.31831 18.4567 5.90409C18.4567 5.48988 18.1209 5.15409 17.7067 5.15409H15.3183C14.9782 3.68139 13.6586 2.5835 12.0826 2.5835C10.5065 2.5835 9.18691 3.68139 8.84682 5.15409H2.29004C1.87583 5.15409 1.54004 5.48988 1.54004 5.90409C1.54004 6.31831 1.87583 6.65409 2.29004 6.65409ZM4.6816 13.3462H2.29085C1.87664 13.3462 1.54085 13.682 1.54085 14.0962C1.54085 14.5104 1.87664 14.8462 2.29085 14.8462H4.68172C5.02181 16.3189 6.34142 17.4168 7.91745 17.4168C9.49348 17.4168 10.8131 16.3189 11.1532 14.8462H17.7075C18.1217 14.8462 18.4575 14.5104 18.4575 14.0962C18.4575 13.682 18.1217 13.3462 17.7075 13.3462H11.1533C10.8134 11.8733 9.49366 10.7752 7.91745 10.7752C6.34124 10.7752 5.02151 11.8733 4.6816 13.3462ZM9.73828 14.096C9.73828 13.0904 8.92307 12.2752 7.91745 12.2752C6.91183 12.2752 6.09662 13.0904 6.09662 14.096C6.09662 15.1016 6.91183 15.9168 7.91745 15.9168C8.92307 15.9168 9.73828 15.1016 9.73828 14.096Z" fill=""></path>
              </svg>
              필터 & 정렬
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-full overflow-x-auto">
        <Table>
          {/* Table Header */}
          <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
            <TableRow>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                로고
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                사이트명
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                URL
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                타입
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                상태
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                통계
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                추천
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                관리
              </TableCell>
            </TableRow>
          </TableHeader>

          {/* Table Body */}
          <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
            {sites.map((site) => {
              const isEditing = editingSite === site.site_seq;
              
              return (
                <TableRow key={site.site_seq}>
                  {/* 로고 */}
                  <TableCell className="px-5 py-4 sm:px-6 text-center">
                    {site.logo_url ? (
                      <img 
                        src={site.logo_url} 
                        alt={`${site.name} 로고`}
                        className="w-10 h-10 rounded-full object-cover mx-auto"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center mx-auto">
                        <span className="text-xs text-gray-500 dark:text-gray-400">로고</span>
                      </div>
                    )}
                  </TableCell>
                  {/* 사이트명 */}
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editValues.name || site.name}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              name: e.target.value,
                            })
                          }
                          className="w-full px-2 py-1 text-sm border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        />
                      ) : (
                        <button
                          onClick={() => navigate(`/site-management/${site.site_seq}`)}
                          className="text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 underline"
                        >
                          {site.name}
                        </button>
                      )}
                    </span>
                  </TableCell>
                  
                  {/* URL */}
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <a 
                      href={site.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 text-theme-xs underline"
                    >
                      {site.url}
                    </a>
                  </TableCell>

                  {/* 타입 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    {isEditing ? (
                      <select
                        value={editValues.type || site.type}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            type: e.target.value as Site['type'],
                          })
                        }
                        className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="casino">카지노</option>
                        <option value="sports">스포츠</option>
                        <option value="holdem">홀덤</option>
                        <option value="sport">스포츠</option>
                        <option value="mixed">혼합</option>
                      </select>
                    ) : (
                      <Badge
                        size="sm"
                        color={getTypeBadgeColor(site.type)}
                      >
                        {getTypeLabel(site.type)}
                      </Badge>
                    )}
                  </TableCell>

                  {/* 상태 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    {isEditing ? (
                      <select
                        value={editValues.status || site.status}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            status: e.target.value as Site['status'],
                          })
                        }
                        className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="active">운영중</option>
                        <option value="suspended">일시중단</option>
                        <option value="closed">폐쇄</option>
                      </select>
                    ) : (
                      <Badge
                        size="sm"
                        color={getStatusBadgeColor(site.status)}
                      >
                        {getStatusLabel(site.status)}
                      </Badge>
                    )}
                  </TableCell>

                  {/* 통계 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        구독자: {site.subscriber_count.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        조회수: {site.view_count.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        평점: {site.avg_rating.toFixed(1)}
                      </div>
                    </div>
                  </TableCell>

                  {/* 추천 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    <div className="space-y-1">
                      <div className="text-xs">
                        {site.is_recommend ? (
                          <span className="text-green-600 dark:text-green-400">추천</span>
                        ) : (
                          <span className="text-gray-500 dark:text-gray-400">일반</span>
                        )}
                      </div>
                      {site.is_recommend && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          순서: {site.recommend_order}
                        </div>
                      )}
                    </div>
                  </TableCell>

                  {/* 관리 */}
                  <TableCell className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleSave(site.site_seq)}
                          disabled={updateSiteMutation.isPending}
                          className="px-3 py-1 text-theme-xs font-medium text-white bg-brand-500 rounded hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="저장"
                        >
                          {updateSiteMutation.isPending ? "저장 중..." : "저장"}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={updateSiteMutation.isPending}
                          className="px-3 py-1 text-theme-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="취소"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(site)}
                          disabled={updateSiteMutation.isPending}
                          className="px-3 py-1 text-theme-xs font-medium text-brand-500 border border-brand-500 rounded hover:bg-brand-50 transition-colors dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="수정"
                        >
                          수정
                        </button>
                        <button
                          onClick={() => handleDelete(site.site_seq)}
                          disabled={deleteSiteMutation.isPending}
                          className="px-3 py-1 text-theme-xs font-medium text-error-500 border border-error-500 rounded hover:bg-error-50 transition-colors dark:hover:bg-error-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="삭제"
                        >
                          삭제
                        </button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* 하단 컨트롤 */}
      <div className="relative flex flex-col items-center px-4 py-5 xl:px-6 xl:py-6">
        {/* 페이지네이션 */}
        <div className="flex justify-center w-full">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            pageSize={pageSize}
            onPageChange={handlePageChange}
          />
        </div>

        {/* 등록 버튼 - 우측 절대 위치 */}
        <div className="absolute right-4 xl:right-6 top-1/2 -translate-y-1/2 mt-0 hidden sm:block">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors whitespace-nowrap"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 3C10.4142 3 10.75 3.33579 10.75 3.75V9.25H16.25C16.6642 9.25 17 9.58579 17 10C17 10.4142 16.6642 10.75 16.25 10.75H10.75V16.25C10.75 16.6642 10.4142 17 10 17C9.58579 17 9.25 16.6642 9.25 16.25V10.75H3.75C3.33579 10.75 3 10.4142 3 10C3 9.58579 3.33579 9.25 3.75 9.25H9.25V3.75C9.25 3.33579 9.58579 3 10 3Z"
                fill="currentColor"
              />
            </svg>
            사이트 등록
          </button>
        </div>

        {/* 모바일용 등록 버튼 */}
        <div className="mt-4 sm:hidden w-full flex justify-center">
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white shadow-theme-xs hover:bg-brand-600 transition-colors whitespace-nowrap"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 3C10.4142 3 10.75 3.33579 10.75 3.75V9.25H16.25C16.6642 9.25 17 9.58579 17 10C17 10.4142 16.6642 10.75 16.25 10.75H10.75V16.25C10.75 16.6642 10.4142 17 10 17C9.58579 17 9.25 16.6642 9.25 16.25V10.75H3.75C3.33579 10.75 3 10.4142 3 10C3 9.58579 3.33579 9.25 3.75 9.25H9.25V3.75C9.25 3.33579 9.58579 3 10 3Z"
                fill="currentColor"
              />
            </svg>
            사이트 등록
          </button>
        </div>
      </div>

      {/* 사이트 등록 모달 */}
      <SiteRegistrationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}