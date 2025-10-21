import { supabase } from "../lib/supabase";
import type { UserInfo, UpdateUserInfoRequest, UserListFilter } from "../types/userInfo";

/**
 * 전체 회원 목록 조회
 */
export const fetchAllUsers = async (): Promise<{
  data: UserInfo[] | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("UserInfo")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching users:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching users:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 필터링된 회원 목록 조회
 */
export const fetchFilteredUsers = async (
  filter: UserListFilter
): Promise<{
  data: UserInfo[] | null;
  error: Error | null;
}> => {
  try {
    let query = supabase.from("UserInfo").select("*");

    // 권한 필터
    if (filter.role) {
      query = query.eq("role", filter.role);
    }

    // 승인 상태 필터
    if (filter.approval_yn !== undefined) {
      query = query.eq("approval_yn", filter.approval_yn);
    }

    // 검색어 필터 (이름, 이메일, 닉네임)
    if (filter.search) {
      query = query.or(
        `name.ilike.%${filter.search}%,email.ilike.%${filter.search}%,nick_name.ilike.%${filter.search}%`
      );
    }

    const { data, error } = await query.order("created_at", {
      ascending: false,
    });

    if (error) {
      console.error("Error fetching filtered users:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching filtered users:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 특정 회원 정보 조회
 */
export const fetchUserById = async (
  userId: string
): Promise<{
  data: UserInfo | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("UserInfo")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Error fetching user by id:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching user by id:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 회원 정보 수정
 */
export const updateUser = async (
  userId: string,
  updates: UpdateUserInfoRequest
): Promise<{
  data: UserInfo | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("UserInfo")
      .update(updates)
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error updating user:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error updating user:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 회원 승인 상태 변경
 */
export const updateApprovalStatus = async (
  userId: string,
  approvalYn: boolean
): Promise<{
  data: UserInfo | null;
  error: Error | null;
}> => {
  return updateUser(userId, { approval_yn: approvalYn });
};

/**
 * 회원 권한 변경
 */
export const updateUserRole = async (
  userId: string,
  role: "user" | "admin" | "super_admin"
): Promise<{
  data: UserInfo | null;
  error: Error | null;
}> => {
  return updateUser(userId, { role });
};

/**
 * 포인트 지급/차감
 */
export const updateUserPoints = async (
  userId: string,
  pointBalance: number
): Promise<{
  data: UserInfo | null;
  error: Error | null;
}> => {
  return updateUser(userId, { point_balance: pointBalance });
};

/**
 * 경험치 지급/차감
 */
export const updateUserExp = async (
  userId: string,
  currentExp: number
): Promise<{
  data: UserInfo | null;
  error: Error | null;
}> => {
  return updateUser(userId, { current_exp: currentExp });
};

