import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";

import Badge from "../ui/badge/Badge";
import type { UserInfo, UserRole, UpdateUserInfoRequest } from "../../types/userInfo";
import { fetchAllUsers, updateUser } from "../../services/userInfo";
import { toast } from 'react-toastify';

export default function UserManagementTable() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editValues, setEditValues] = useState<UpdateUserInfoRequest>({});
  const [saving, setSaving] = useState(false);

  // 회원 목록 불러오기
  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await fetchAllUsers();

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    if (data) {
      setUsers(data);
    }

    setLoading(false);
  };

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

  const handleSave = async (userId: string) => {
    setSaving(true);

    const { data, error: updateError } = await updateUser(userId, editValues);

    if (updateError) {
      toast.error(`저장 실패: ${updateError.message}`);
      setSaving(false);
      return;
    }

    if (data) {
      // 로컬 상태 업데이트
      setUsers(
        users.map((user) =>
          user.id === userId ? data : user
        )
      );
      toast.success("회원 정보가 저장되었습니다.");
    }

    setEditingUser(null);
    setEditValues({});
    setSaving(false);
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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
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
          <p className="mt-2 text-gray-500 dark:text-gray-400">{error}</p>
          <button
            onClick={loadUsers}
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
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-500 dark:text-gray-400">등록된 회원이 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
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
                          className="w-20 px-2 py-1 text-center border rounded dark:bg-gray-800 dark:border-gray-700"
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
                          className="w-20 px-2 py-1 text-center border rounded dark:bg-gray-800 dark:border-gray-700"
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
                        className="w-24 px-2 py-1 text-center border rounded dark:bg-gray-800 dark:border-gray-700"
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
                        className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
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
                        className="px-2 py-1 border rounded dark:bg-gray-800 dark:border-gray-700"
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
                          disabled={saving}
                          className="px-3 py-1 text-theme-xs font-medium text-white bg-brand-500 rounded hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="저장"
                        >
                          {saving ? "저장 중..." : "저장"}
                        </button>
                        <button
                          onClick={handleCancel}
                          disabled={saving}
                          className="px-3 py-1 text-theme-xs font-medium text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                          aria-label="취소"
                        >
                          취소
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEdit(user)}
                        disabled={saving}
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
    </div>
  );
}
