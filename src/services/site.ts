import { supabase } from "../lib/supabase";
import type { Site, SiteInfo, SiteDepositPromotion, SiteEvent, SiteFilter, UpdateSiteRequest, UpdateSiteInfoRequest, SiteRegistrationData } from "../types/site";
import { deleteImage } from "./fileUpload";

/**
 * 전체 사이트 목록 조회
 */
export const fetchAllSites = async (): Promise<{
  data: Site[] | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("Site")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching sites:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching sites:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 필터링된 사이트 목록 조회 (페이지네이션 포함)
 */
export const fetchFilteredSites = async (
  filter: SiteFilter,
  page: number = 1,
  pageSize: number = 10
): Promise<{
  data: (Site & { logo_url?: string })[] | null;
  totalCount: number;
  error: Error | null;
}> => {
  try {
    let query = supabase.from("Site").select("*", { count: 'exact' });

    // 타입 필터
    if (filter.type) {
      query = query.eq("type", filter.type);
    }

    // 상태 필터
    if (filter.status) {
      query = query.eq("status", filter.status);
    }

    // 추천 여부 필터
    if (filter.is_recommend !== undefined) {
      query = query.eq("is_recommend", filter.is_recommend);
    }

    // 검색어 필터 (이름, URL)
    if (filter.search) {
      query = query.or(
        `name.ilike.%${filter.search}%,url.ilike.%${filter.search}%`
      );
    }

    // 페이지네이션 적용
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error("Error fetching filtered sites:", error);
      return { data: null, totalCount: 0, error: new Error(error.message) };
    }

    // 로고 이미지 URL 배치 조회 (비식별 관계)
    const logoImageIds = (data || [])
      .map(site => site.logo_image)
      .filter((id): id is string => id !== null && id !== undefined);
    
    let logoUrls: Record<string, string> = {};
    
    if (logoImageIds.length > 0) {
      try {
        const { data: fileData, error: fileError } = await supabase
          .from("File")
          .select("file_seq, file_url")
          .in("file_seq", logoImageIds);
        
        if (!fileError && fileData) {
          logoUrls = fileData.reduce((acc, file) => {
            acc[file.file_seq] = file.file_url;
            return acc;
          }, {} as Record<string, string>);
        }
      } catch (err) {
        console.warn("Failed to fetch logo URLs:", err);
      }
    }
    
    const sitesWithLogo = (data || []).map(site => ({
      ...site,
      logo_url: site.logo_image ? logoUrls[site.logo_image] || null : null
    }));

    return { 
      data: sitesWithLogo || [], 
      totalCount: count || 0, 
      error: null 
    };
  } catch (err) {
    console.error("Unexpected error fetching filtered sites:", err);
    return {
      data: null,
      totalCount: 0,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 특정 사이트 정보 조회
 */
export const fetchSiteById = async (
  siteSeq: string
): Promise<{
  data: Site | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("Site")
      .select("*")
      .eq("site_seq", siteSeq)
      .single();

    if (error) {
      console.error("Error fetching site by id:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching site by id:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 정보 수정
 */
export const updateSite = async (
  siteSeq: string,
  updates: UpdateSiteRequest
): Promise<{
  data: Site | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("Site")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("site_seq", siteSeq)
      .select()
      .single();

    if (error) {
      console.error("Error updating site:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error updating site:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 상태 변경
 */
export const updateSiteStatus = async (
  siteSeq: string,
  status: 'active' | 'suspended' | 'closed'
): Promise<{
  data: Site | null;
  error: Error | null;
}> => {
  return updateSite(siteSeq, { status });
};

/**
 * 사이트 추천 상태 변경
 */
export const updateSiteRecommend = async (
  siteSeq: string,
  isRecommend: boolean,
  recommendOrder?: number
): Promise<{
  data: Site | null;
  error: Error | null;
}> => {
  return updateSite(siteSeq, { 
    is_recommend: isRecommend,
    recommend_order: recommendOrder || 0
  });
};

/**
 * 통합 사이트 등록 (Site + SiteInfo + SitePromotion)
 */
export const createSiteWithDetails = async (
  siteData: SiteRegistrationData
): Promise<{
  data: Site | null;
  error: Error | null;
}> => {
  try {
        // 1. Site 테이블에 기본 정보 삽입 (UUID 자동 생성, 로고 이미지 포함)
        const { data: siteResult, error: siteError } = await supabase
          .from("Site")
          .insert({
            name: siteData.name,
            url: siteData.url,
            type: siteData.type,
            is_recommend: false, // 기본값으로 false 설정
            recommend_order: 0, // 기본값으로 0 설정
            status: siteData.status,
            avg_rating: 0.0, // 기본값으로 0.0 설정
            subscriber_count: 0,
            view_count: 0,
            logo_image: siteData.logo_image || null, // 로고 이미지 UUID
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .select()
          .single();

    if (siteError || !siteResult) {
      console.error("Error creating site:", siteError);
      return { data: null, error: new Error(siteError?.message || "Site creation failed") };
    }

        // 2. SiteInfo 테이블에 상세 정보 삽입 (UUID 자동 생성)
        const { error: siteInfoError } = await supabase
          .from("SiteInfo")
          .insert({
            site_seq: siteResult.site_seq,
            deposit_min: siteData.deposit_min,
            first_bonus: siteData.first_bonus,
            daily_repeat_bonus: siteData.daily_repeat_bonus,
            casino_payback: siteData.casino_payback,
            slot_payback: siteData.slot_payback,
            rolling_rate: siteData.rolling_rate,
            bet_limit_min: siteData.bet_limit_min,
            bet_limit_max: siteData.bet_limit_max,
            site_feature: siteData.site_feature,
            deposit_method: siteData.is_crypto ? '가상화폐 지원' : '일반 입출금',
            withdrawal_method: siteData.is_crypto ? '가상화폐 지원' : '일반 입출금',
            daily_first_bonus: siteData.daily_first_bonus || 0,
            slot_comp: siteData.slot_comp || 0,
            casino_comp: siteData.casino_comp || 0,
            casino_bonus: siteData.casino_bonus || 0,
            slot_bonus: siteData.slot_bonus || 0,
            sport_bonus: siteData.sport_bonus || 0,
            sport_payback: siteData.sport_payback || 0,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (siteInfoError) {
          // SiteInfo 삽입 실패 시 Site 삭제 (CASCADE로 관련 데이터도 자동 삭제)
          await supabase.from("Site").delete().eq("site_seq", siteResult.site_seq);
          console.error("Error creating site info:", siteInfoError);
          return { data: null, error: new Error(siteInfoError.message) };
        }

        // 3. SiteDepositPromotion 테이블에 입플 정보 삽입 (여러 개, UUID 자동 생성)
        if (siteData.promotions && siteData.promotions.length > 0) {
          const promotionData = siteData.promotions.map(promotion => ({
            site_seq: siteResult.site_seq,
            promotion_name: `${promotion.bonus_rate}+${promotion.bonus_amount} 입플`,
            deposit_type: 'first', // 기본값으로 첫 충전 설정
            bonus_rate: promotion.bonus_rate,
            bonus_amount: promotion.bonus_amount,
            max_bonus: 0, // 기본값
            min_deposit: 0, // 기본값
            rollover_requirement: 0, // 기본값
            valid_days: 30, // 기본값
            description: '입플 프로모션',
            terms_conditions: '이용 약관에 따라 적용됩니다.',
            is_active: true, // 기본값
            display_order: 0, // 기본값
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }));

          const { error: promotionError } = await supabase
            .from("SiteDepositPromotion")
            .insert(promotionData);

          if (promotionError) {
            // SiteDepositPromotion 삽입 실패 시 Site 삭제 (CASCADE로 SiteInfo도 자동 삭제)
            await supabase.from("Site").delete().eq("site_seq", siteResult.site_seq);
            console.error("Error creating site promotions:", promotionError);
            return { data: null, error: new Error(promotionError.message) };
          }
        }

        return { data: siteResult, error: null };
      } catch (err) {
        console.error("Unexpected error creating site with details:", err);
        return {
          data: null,
          error: err instanceof Error ? err : new Error("Unknown error"),
        };
      }
    };

/**
 * 사이트 생성 (기본 버전 - 하위 호환성)
 */
export const createSite = async (
  siteData: Omit<Site, 'site_seq' | 'created_at' | 'updated_at' | 'subscriber_count' | 'view_count'>
): Promise<{
  data: Site | null;
  error: Error | null;
}> => {
  try {
    // UUID 생성 (Supabase에서 자동 생성되지만 명시적으로 생성)
    const { data, error } = await supabase
      .from("Site")
      .insert({
        ...siteData,
        subscriber_count: 0,
        view_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating site:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error creating site:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 삭제 (CASCADE 삭제 활용 + 로고 이미지 삭제)
 * Site 삭제 시 관련 테이블들이 자동으로 삭제됩니다:
 * - SiteInfo
 * - SiteDepositPromotion  
 * - SiteEvent
 * - SiteBannerImg
 * - Site.logo_image는 NULL로 설정 (File은 유지)
 * 
 * 추가로 로고 이미지가 있으면 File 테이블과 Storage에서도 삭제합니다.
 */
export const deleteSite = async (
  siteSeq: string
): Promise<{
  error: Error | null;
}> => {
  try {
    // 1. 먼저 사이트 정보 조회 (로고 이미지 확인용)
    const { data: siteData, error: fetchError } = await supabase
      .from("Site")
      .select("site_seq, logo_image")
      .eq("site_seq", siteSeq)
      .single();

    if (fetchError) {
      console.error("Error fetching site for deletion:", fetchError);
      return { error: new Error(fetchError.message) };
    }

    // 2. 로고 이미지가 있으면 File 테이블과 Storage에서 삭제
    if (siteData.logo_image) {
      try {
        const deleteResult = await deleteImage(siteData.logo_image);
        if (!deleteResult.success) {
          console.warn("Failed to delete logo image:", deleteResult.error);
        }
      } catch (err) {
        console.warn("Error deleting logo image:", err);
        // 로고 삭제 실패해도 사이트 삭제는 계속 진행
      }
    }

    // 3. Site 삭제 (CASCADE로 관련 테이블들도 자동 삭제)
    const { error } = await supabase
      .from("Site")
      .delete()
      .eq("site_seq", siteSeq);

    if (error) {
      console.error("Error deleting site:", error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error("Unexpected error deleting site:", err);
    return {
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 삭제 테스트 (로고 이미지 포함)
 * 실제 삭제 전에 어떤 데이터가 삭제될지 확인하는 함수
 */
export const previewSiteDeletion = async (
  siteSeq: string
): Promise<{
  site: Site | null;
  logoImage: { file_seq: string; file_url: string; file_path: string } | null;
  relatedData: {
    siteInfo: any[];
    promotions: any[];
    events: any[];
    banners: any[];
  };
  error: Error | null;
}> => {
  try {
    // 사이트 정보 조회
    const { data: site, error: siteError } = await supabase
      .from("Site")
      .select("*")
      .eq("site_seq", siteSeq)
      .single();

    if (siteError) {
      return { site: null, logoImage: null, relatedData: { siteInfo: [], promotions: [], events: [], banners: [] }, error: new Error(siteError.message) };
    }

    // 로고 이미지 정보 조회
    let logoImage = null;
    if (site.logo_image) {
      const { data: fileData, error: fileError } = await supabase
        .from("File")
        .select(`
          file_seq,
          file_url,
          file_detail:FileDetail(file_path)
        `)
        .eq("file_seq", site.logo_image)
        .single();

      if (!fileError && fileData) {
        logoImage = {
          file_seq: fileData.file_seq,
          file_url: fileData.file_url,
          file_path: (fileData as any).file_detail?.file_path || ''
        };
      }
    }

    // 관련 데이터 조회
    const [siteInfoResult, promotionsResult, eventsResult, bannersResult] = await Promise.all([
      supabase.from("SiteInfo").select("*").eq("site_seq", siteSeq),
      supabase.from("SiteDepositPromotion").select("*").eq("site_seq", siteSeq),
      supabase.from("SiteEvent").select("*").eq("site_seq", siteSeq),
      supabase.from("SiteBannerImg").select("*").eq("site_seq", siteSeq)
    ]);

    return {
      site,
      logoImage,
      relatedData: {
        siteInfo: siteInfoResult.data || [],
        promotions: promotionsResult.data || [],
        events: eventsResult.data || [],
        banners: bannersResult.data || []
      },
      error: null
    };
  } catch (err) {
    return {
      site: null,
      logoImage: null,
      relatedData: { siteInfo: [], promotions: [], events: [], banners: [] },
      error: err instanceof Error ? err : new Error("Unknown error")
    };
  }
};

/**
 * 사이트 상세 정보 조회 (SiteInfo 포함)
 */
export const fetchSiteWithInfo = async (
  siteSeq: string
): Promise<{
  data: (Site & { site_info?: SiteInfo; promotions?: SiteDepositPromotion[] }) | null;
  error: Error | null;
}> => {
  try {
    // 먼저 Site 정보 조회
    const { data: siteData, error: siteError } = await supabase
      .from("Site")
      .select("*")
      .eq("site_seq", siteSeq)
      .single();

    if (siteError) {
      console.error("Error fetching site:", siteError);
      return { data: null, error: new Error(siteError.message) };
    }

    if (!siteData) {
      return { data: null, error: new Error("Site not found") };
    }

    // SiteInfo 정보 조회
    const { data: siteInfoData, error: siteInfoError } = await supabase
      .from("SiteInfo")
      .select("*")
      .eq("site_seq", siteSeq)
      .single();

    // SiteDepositPromotion 정보 조회
    const { data: promotionsData, error: promotionsError } = await supabase
      .from("SiteDepositPromotion")
      .select("*")
      .eq("site_seq", siteSeq)
      .order("created_at", { ascending: false });

    if (siteInfoError) {
      console.warn("SiteInfo not found for site:", siteSeq, siteInfoError);
    }

    if (promotionsError) {
      console.warn("SiteDepositPromotion not found for site:", siteSeq, promotionsError);
    }

    return { 
      data: { 
        ...siteData, 
        site_info: siteInfoData || undefined,
        promotions: promotionsData || []
      }, 
      error: null 
    };
  } catch (err) {
    console.error("Unexpected error fetching site with info:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 입플 프로모션 추가
 */
export const addPromotion = async (
  siteSeq: string,
  promotionData: Omit<SiteDepositPromotion, 'promotion_seq' | 'site_seq' | 'created_at' | 'updated_at'>
): Promise<{
  data: SiteDepositPromotion | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("SiteDepositPromotion")
      .insert({
        site_seq: siteSeq,
        ...promotionData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error adding promotion:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error adding promotion:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 입플 프로모션 수정
 */
export const updatePromotion = async (
  promotionSeq: string,
  updates: Partial<Omit<SiteDepositPromotion, 'promotion_seq' | 'site_seq' | 'created_at' | 'updated_at'>>
): Promise<{
  data: SiteDepositPromotion | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("SiteDepositPromotion")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("promotion_seq", promotionSeq)
      .select()
      .single();

    if (error) {
      console.error("Error updating promotion:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error updating promotion:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 입플 프로모션 삭제
 */
export const deletePromotion = async (
  promotionSeq: string
): Promise<{
  error: Error | null;
}> => {
  try {
    const { error } = await supabase
      .from("SiteDepositPromotion")
      .delete()
      .eq("promotion_seq", promotionSeq);

    if (error) {
      console.error("Error deleting promotion:", error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error("Unexpected error deleting promotion:", err);
    return {
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * SiteInfo 정보 수정
 */
export const updateSiteInfo = async (
  siteSeq: string,
  updates: UpdateSiteInfoRequest
): Promise<{
  data: SiteInfo | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("SiteInfo")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("site_seq", siteSeq)
      .select()
      .single();

    if (error) {
      console.error("Error updating site info:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error updating site info:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 이벤트 목록 조회
 */
export const fetchSiteEvents = async (siteSeq: string): Promise<{
  data: SiteEvent[] | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("SiteEvent")
      .select("*")
      .eq("site_seq", siteSeq)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("Error fetching site events:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error fetching site events:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 이벤트 추가
 */
export const addSiteEvent = async (
  siteSeq: string,
  eventData: Omit<SiteEvent, "site_event_seq" | "site_seq" | "created_at" | "updated_at" | "view_count">
): Promise<{
  data: SiteEvent | null;
  error: Error | null;
}> => {
  try {
    const insertData = {
      site_seq: siteSeq,
      ...eventData,
      view_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    console.log('Supabase에 전송할 데이터:', insertData);

    const { data, error } = await supabase
      .from("SiteEvent")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Error adding site event:", error);
      return { data: null, error: new Error(error.message) };
    }

    console.log('Supabase 응답 데이터:', data);
    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error adding site event:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 이벤트 수정
 */
export const updateSiteEvent = async (
  eventSeq: string,
  updates: Partial<Omit<SiteEvent, "site_event_seq" | "site_seq" | "created_at" | "updated_at">>
): Promise<{
  data: SiteEvent | null;
  error: Error | null;
}> => {
  try {
    const { data, error } = await supabase
      .from("SiteEvent")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("site_event_seq", eventSeq)
      .select()
      .single();

    if (error) {
      console.error("Error updating site event:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data, error: null };
  } catch (err) {
    console.error("Unexpected error updating site event:", err);
    return {
      data: null,
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};

/**
 * 사이트 이벤트 삭제
 */
export const deleteSiteEvent = async (
  eventSeq: string
): Promise<{
  error: Error | null;
}> => {
  try {
    const { error } = await supabase
      .from("SiteEvent")
      .delete()
      .eq("site_event_seq", eventSeq);

    if (error) {
      console.error("Error deleting site event:", error);
      return { error: new Error(error.message) };
    }

    return { error: null };
  } catch (err) {
    console.error("Unexpected error deleting site event:", err);
    return {
      error: err instanceof Error ? err : new Error("Unknown error"),
    };
  }
};
