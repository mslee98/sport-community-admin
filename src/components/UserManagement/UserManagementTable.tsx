import { useState, useMemo } from "react";
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
import type { UserInfo, UserRole, UpdateUserInfoRequest, UserListFilter } from "../../types/userInfo";
import { fetchFilteredUsers, updateUser } from "../../services/userInfo";
import { toast } from 'react-toastify';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export default function UserManagementTable() {
  const queryClient = useQueryClient();
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<UpdateUserInfoRequest>({});
  
  // 페이지네이션 상태
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10); // 페이지당 항목 수
  
  // 필터링 및 검색 상태
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'approved' | 'pending'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // 필터 객체 생성
  const filter: UserListFilter = useMemo(() => {
    const filterObj: UserListFilter = {};
    
    // 승인 상태 필터
    if (selectedFilter === 'approved') {
      filterObj.approval_yn = true;
    } else if (selectedFilter === 'pending') {
      filterObj.approval_yn = false;
    }
    
    // 검색어 필터
    if (searchTerm.trim()) {
      filterObj.search = searchTerm.trim();
    }
    
    return filterObj;
  }, [selectedFilter, searchTerm]);

  // React Query로 필터링된 회원 목록 불러오기 (서버 사이드 페이지네이션)
  const { 
    data: queryResult, 
    isLoading: loading, 
    error,
    refetch 
  } = useQuery({
    queryKey: ['users', filter, currentPage, pageSize],
    queryFn: async () => {
      const { data, totalCount, error } = await fetchFilteredUsers(filter, currentPage, pageSize);
      if (error) throw error;
      return { users: data || [], totalCount };
    },
    placeholderData: (previousData) => previousData, // 페이지 변경 시 이전 데이터 유지
  });

  const users = queryResult?.users || [];
  const totalCount = queryResult?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  // 각 필터별 사용자 수 계산 (별도 쿼리로 최적화 가능)
  const { data: countData } = useQuery({
    queryKey: ['userCounts'],
    queryFn: async () => {
      const [allResult, approvedResult, pendingResult] = await Promise.all([
        fetchFilteredUsers({}),
        fetchFilteredUsers({ approval_yn: true }),
        fetchFilteredUsers({ approval_yn: false })
      ]);
      
      return {
        allCount: allResult.totalCount,
        approvedCount: approvedResult.totalCount,
        pendingCount: pendingResult.totalCount
      };
    },
    staleTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  const userCounts = countData || { allCount: 0, approvedCount: 0, pendingCount: 0 };

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // 페이지 변경 시 편집 상태 초기화
    setEditingUser(null);
    setEditValues({});
  };

  // 필터 변경 핸들러
  const handleFilterChange = (filter: 'all' | 'approved' | 'pending') => {
    setSelectedFilter(filter);
    setCurrentPage(1); // 필터 변경 시 첫 페이지로 이동
  };

  // 검색 핸들러
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1); // 검색 시 첫 페이지로 이동
  };

  // 회원 정보 수정 mutation
  const updateUserMutation = useMutation({
    mutationFn: ({ userId, updates }: { userId: string; updates: UpdateUserInfoRequest }) =>
      updateUser(userId, updates),
    onSuccess: (response) => {
      if (response.data) {
        // 모든 사용자 관련 쿼리 무효화하여 리스트 갱신
        queryClient.invalidateQueries({ queryKey: ['users'] });
        queryClient.invalidateQueries({ queryKey: ['userCounts'] });
        toast.success("회원 정보가 저장되었습니다.");
        setEditingUser(null);
        setEditValues({});
      }
    },
    onError: (error: Error) => {
      toast.error(`저장 실패: ${error.message}`);
    },
  });

  const handleEdit = (user: UserInfo) => {
    setEditingUser(user.id);
    setEditValues({
      level: user.level,
      current_exp: user.current_exp,
      point_balance: user.point_balance,
      role: user.role,
      approval_yn: user.approval_yn,
    });
  };

  const handleSave = (userId: string) => {
    updateUserMutation.mutate({ userId, updates: editValues });
  };

  const handleCancel = () => {
    setEditingUser(null);
    setEditValues({});
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "error";
      case "admin":
        return "warning";
      default:
        return "info";
    }
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case "super_admin":
        return "최고 관리자";
      case "admin":
        return "관리자";
      default:
        return "일반 회원";
    }
  };

  const getApprovalBadgeColor = (approvalYn: boolean) => {
    return approvalYn ? "success" : "error";
  };

  const getApprovalLabel = (approvalYn: boolean) => {
    return approvalYn ? "승인" : "미승인";
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
            className="mt-4 px-4 py-2 bg-brand-500 text-white rounded hover:bg-brand-600 transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // 데이터가 없는 경우
  if (users.length === 0) {
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
                전체 사용자
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                  selectedFilter === 'all' 
                    ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                    : 'bg-white dark:bg-white/[0.03]'
                }`}>
                  {userCounts.allCount}
                </span>
              </button>

              <button
                onClick={() => handleFilterChange('approved')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                  selectedFilter === 'approved' 
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                승인된 사용자
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                  selectedFilter === 'approved' 
                    ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                    : 'bg-white dark:bg-white/[0.03]'
                }`}>
                  {userCounts.approvedCount}
                </span>
              </button>

              <button
                onClick={() => handleFilterChange('pending')}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                  selectedFilter === 'pending' 
                    ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                미승인 사용자
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                  selectedFilter === 'pending' 
                    ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                    : 'bg-white dark:bg-white/[0.03]'
                }`}>
                  {userCounts.pendingCount}
                </span>
              </button>
            </div>

            {/* 검색 및 필터 버튼 */}
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              {/* 검색창 */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="사용자 검색..."
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
              {searchTerm ? '검색 결과가 없습니다.' : '해당 조건에 맞는 사용자가 없습니다.'}
            </p>
          </div>
        </div>
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
              전체 사용자
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                selectedFilter === 'all' 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                  : 'bg-white dark:bg-white/[0.03]'
              }`}>
                {userCounts.allCount}
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('approved')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                selectedFilter === 'approved' 
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              승인된 사용자
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                selectedFilter === 'approved' 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                  : 'bg-white dark:bg-white/[0.03]'
              }`}>
                {userCounts.approvedCount}
              </span>
            </button>

            <button
              onClick={() => handleFilterChange('pending')}
              className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md group hover:text-gray-900 dark:hover:text-white ${
                selectedFilter === 'pending' 
                  ? 'text-gray-900 dark:text-white bg-white dark:bg-gray-800' 
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            >
              미승인 사용자
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium leading-normal group-hover:bg-brand-50 group-hover:text-brand-500 dark:group-hover:bg-brand-500/15 dark:group-hover:text-brand-400 ${
                selectedFilter === 'pending' 
                  ? 'text-brand-500 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/15' 
                  : 'bg-white dark:bg-white/[0.03]'
              }`}>
                {userCounts.pendingCount}
              </span>
            </button>
          </div>

          {/* 검색 및 필터 버튼 */}
          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            {/* 검색창 */}
            <div className="relative">
              <input
                type="text"
                placeholder="사용자 검색..."
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
                className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
              >
                회원정보
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                레벨/경험치
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                포인트
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                권한
              </TableCell>
              <TableCell
                isHeader
                className="px-5 py-3 font-medium text-gray-500 text-center text-theme-xs dark:text-gray-400"
              >
                승인여부
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
            {users.map((user) => {
              const isEditing = editingUser === user.id;
              
              return (
                <TableRow key={user.id}>
                  {/* 회원정보 */}
                  <TableCell className="px-5 py-4 sm:px-6 text-start">
                    <div className="flex items-center gap-3">
                      {user.profileImage && (
                        <div className="w-10 h-10 overflow-hidden rounded-full">
                          <img
                            width={40}
                            height={40}
                            src={user.profileImage}
                            alt={user.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div>
                        <span className="block font-medium text-gray-800 text-theme-sm dark:text-white/90">
                          {user.name} ({user.nick_name})
                        </span>
                        <span className="block text-gray-500 text-theme-xs dark:text-gray-400">
                          {user.email}
                        </span>
                      </div>
                    </div>
                  </TableCell>

                  {/* 레벨/경험치 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    {isEditing ? (
                      <div className="flex flex-col gap-1">
                        <input
                          type="number"
                          value={editValues.level || user.level}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              level: parseInt(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 text-center border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          placeholder="레벨"
                        />
                        <input
                          type="number"
                          value={editValues.current_exp || user.current_exp}
                          onChange={(e) =>
                            setEditValues({
                              ...editValues,
                              current_exp: parseInt(e.target.value),
                            })
                          }
                          className="w-20 px-2 py-1 text-center border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                          placeholder="경험치"
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white/90">
                          Lv.{user.level}
                        </div>
                        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                          {user.current_exp.toLocaleString()} / {user.total_exp.toLocaleString()} EXP
                        </div>
                      </div>
                    )}
                  </TableCell>

                  {/* 포인트 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    {isEditing ? (
                      <input
                        type="number"
                        value={editValues.point_balance || user.point_balance}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            point_balance: parseInt(e.target.value),
                          })
                        }
                        className="w-24 px-2 py-1 text-center border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                        placeholder="포인트"
                      />
                    ) : (
                      <div>
                        <div className="font-medium text-gray-800 dark:text-white/90">
                          {user.point_balance.toLocaleString()}P
                        </div>
                        <div className="text-theme-xs text-gray-500 dark:text-gray-400">
                          획득: {user.total_earned_point.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </TableCell>

                  {/* 권한 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    {isEditing ? (
                      <select
                        value={editValues.role || user.role}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            role: e.target.value as UserRole,
                          })
                        }
                        className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="user">일반 회원</option>
                        <option value="admin">관리자</option>
                        <option value="super_admin">최고 관리자</option>
                      </select>
                    ) : (
                      <Badge
                        size="sm"
                        color={getRoleBadgeColor(user.role)}
                      >
                        {getRoleLabel(user.role)}
                      </Badge>
                    )}
                  </TableCell>

                  {/* 승인여부 */}
                  <TableCell className="px-4 py-3 text-center text-theme-sm">
                    {isEditing ? (
                      <select
                        value={editValues.approval_yn !== undefined ? String(editValues.approval_yn) : String(user.approval_yn)}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            approval_yn: e.target.value === "true",
                          })
                        }
                        className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                      >
                        <option value="true">승인</option>
                        <option value="false">미승인</option>
                      </select>
                    ) : (
                      <Badge
                        size="sm"
                        color={getApprovalBadgeColor(user.approval_yn)}
                      >
                        {getApprovalLabel(user.approval_yn)}
                      </Badge>
                    )}
                  </TableCell>

                  {/* 관리 */}
                  <TableCell className="px-4 py-3 text-center">
                    {isEditing ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleSave(user.id)}
                          disabled={updateUserMutation.isPending}
                          className="px-3 py-1 text-theme-xs font-medium text-white bg-brand-500 rounded hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="저장"
                        >
                          {updateUserMutation.isPending ? "저장 중..." : "저장"}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={updateUserMutation.isPending}
                          className="px-3 py-1 text-theme-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="취소"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(user)}
                        disabled={updateUserMutation.isPending}
                        className="px-3 py-1 text-theme-xs font-medium text-brand-500 border border-brand-500 rounded hover:bg-brand-50 transition-colors dark:hover:bg-brand-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                        aria-label="수정"
                      >
                        수정
                      </button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      
      {/* 페이지네이션 */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={totalCount}
        pageSize={pageSize}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
