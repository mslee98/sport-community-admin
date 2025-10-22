import { supabase } from "../lib/supabase";

// 환경 변수 검증 함수
const validateEnvVars = () => {
  const requiredVars = [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !import.meta.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn(`Missing environment variables: ${missingVars.join(', ')}`);
    console.warn('Please check your .env.local file and ensure all required variables are set.');
  }
  
  return missingVars.length === 0;
};

// 환경 변수 디버깅 함수
export const debugEnvVars = () => {
  console.log('=== 환경 변수 디버깅 ===');
  console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? '설정됨' : '설정되지 않음');
  console.log('VITE_SUPABASE_STORAGE_BUCKET:', import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'file (기본값)');
  console.log('VITE_SUPABASE_STORAGE_URL:', import.meta.env.VITE_SUPABASE_STORAGE_URL);
  console.log('========================');
};

// Supabase 연결 상태 디버깅 함수
export const debugSupabaseConnection = async () => {
  try {
    console.log('=== Supabase 연결 상태 디버깅 ===');
    
    // 현재 세션 확인
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('현재 세션:', session ? '로그인됨' : '로그인되지 않음');
    if (sessionError) console.log('세션 에러:', sessionError);
    
    // File 테이블 접근 테스트
    const { error: fileError } = await supabase
      .from('File')
      .select('count')
      .limit(1);
    
    console.log('File 테이블 접근:', fileError ? '실패' : '성공');
    if (fileError) console.log('File 테이블 에러:', fileError);
    
    // File 테이블 직접 삽입 테스트
    const { data: insertTest, error: insertError } = await supabase
      .from('File')
      .insert({
        file_name: 'test-debug.jpg',
        file_url: 'https://example.com/test.jpg',
        file_type: 'image/jpeg',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select();
    
    console.log('File 테이블 삽입 테스트:', insertError ? '실패' : '성공');
    if (insertError) console.log('File 테이블 삽입 에러:', insertError);
    
    // Storage 버킷 접근 테스트
    const { error: bucketError } = await supabase.storage
      .from('file')
      .list('', { limit: 1 });
    
    console.log('Storage 버킷 접근:', bucketError ? '실패' : '성공');
    if (bucketError) console.log('Storage 버킷 에러:', bucketError);
    
    console.log('================================');
  } catch (err) {
    console.error('디버깅 중 에러:', err);
  }
};

export interface UploadResult {
  success: boolean;
  fileUrl?: string;
  fileSeq?: string;
  error?: string;
}

export interface FileUploadData {
  fileName: string;
  fileType: string;
  fileSize: number;
  fileUrl: string;
  filePath: string;
  fileExtension: string;
}

/**
 * 이미지 파일을 Supabase Storage에 업로드
 */
export const uploadImageToStorage = async (
  file: File,
  bucketName: string = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'file',
  folderPath: string = 'sites/logos'
): Promise<{
  success: boolean;
  filePath?: string;
  fileUrl?: string;
  error?: string;
}> => {
  try {
    // 파일명 중복 방지를 위해 UUID 추가
    const fileExtension = file.name.split('.').pop() || '';
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExtension}`;
    const filePath = `${folderPath}/${fileName}`;

    // Supabase Storage에 파일 업로드
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });

    if (error) {
      console.error('Storage upload error:', error);
      return { success: false, error: error.message };
    }

    // 공개 URL 생성
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    return {
      success: true,
      filePath: data.path,
      fileUrl: publicUrl
    };
  } catch (err) {
    console.error('Unexpected upload error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};

/**
 * 파일 정보를 File 테이블에 저장
 */
export const saveFileToDatabase = async (
  fileData: FileUploadData
): Promise<{
  success: boolean;
  fileSeq?: string;
  error?: string;
}> => {
  try {
    // File 테이블에 기본 정보 저장
    const { data: fileResult, error: fileError } = await supabase
      .from("File")
      .insert({
        file_name: fileData.fileName,
        file_url: fileData.fileUrl,
        file_type: fileData.fileType,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (fileError) {
      console.error('File table insert error:', fileError);
      return { success: false, error: fileError.message };
    }

    // FileDetail 테이블에 상세 정보 저장
    const { error: detailError } = await supabase
      .from("FileDetail")
      .insert({
        file_seq: fileResult.file_seq,
        file_name: fileData.fileName,
        file_path: fileData.filePath,
        file_size: fileData.fileSize,
        file_extension: fileData.fileExtension,
        file_sn: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    if (detailError) {
      // FileDetail 실패 시 File도 삭제 (롤백)
      await supabase.from("File").delete().eq("file_seq", fileResult.file_seq);
      console.error('FileDetail table insert error:', detailError);
      return { success: false, error: detailError.message };
    }

    return {
      success: true,
      fileSeq: fileResult.file_seq
    };
  } catch (err) {
    console.error('Unexpected database error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};

/**
 * 통합 이미지 업로드 함수 (Storage + Database)
 */
export const uploadImage = async (
  file: File,
  bucketName: string = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'file',
  folderPath: string = 'sites/logos'
): Promise<UploadResult> => {
  try {
    // 1. Storage에 파일 업로드
    const uploadResult = await uploadImageToStorage(file, bucketName, folderPath);
    
    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    // 2. Database에 파일 정보 저장
    const fileData: FileUploadData = {
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      fileUrl: uploadResult.fileUrl!,
      filePath: uploadResult.filePath!,
      fileExtension: file.name.split('.').pop() || ''
    };

    const saveResult = await saveFileToDatabase(fileData);
    
    if (!saveResult.success) {
      // Database 저장 실패 시 Storage에서도 파일 삭제
      await supabase.storage
        .from(bucketName)
        .remove([uploadResult.filePath!]);
      
      return { success: false, error: saveResult.error };
    }

    return {
      success: true,
      fileUrl: uploadResult.fileUrl,
      fileSeq: saveResult.fileSeq
    };
  } catch (err) {
    console.error('Unexpected upload error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};

/**
 * 이미지 삭제 함수
 */
export const deleteImage = async (
  fileSeq: string,
  bucketName: string = import.meta.env.VITE_SUPABASE_STORAGE_BUCKET || 'file'
): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // FileDetail에서 파일 경로 조회
    const { data: fileDetail, error: detailError } = await supabase
      .from("FileDetail")
      .select("file_path")
      .eq("file_seq", fileSeq)
      .single();

    if (detailError) {
      console.error('FileDetail query error:', detailError);
      return { success: false, error: detailError.message };
    }

    // Storage에서 파일 삭제
    const { error: storageError } = await supabase.storage
      .from(bucketName)
      .remove([fileDetail.file_path]);

    if (storageError) {
      console.error('Storage delete error:', storageError);
      return { success: false, error: storageError.message };
    }

    // Database에서 파일 정보 삭제 (CASCADE로 FileDetail도 자동 삭제)
    // File 삭제 시 관련 테이블들이 자동으로 삭제됩니다:
    // - FileDetail
    // - SiteBannerImg  
    // - Site.logo_image는 NULL로 설정 (사이트는 유지)
    const { error: dbError } = await supabase
      .from("File")
      .delete()
      .eq("file_seq", fileSeq);

    if (dbError) {
      console.error('Database delete error:', dbError);
      return { success: false, error: dbError.message };
    }

    return { success: true };
  } catch (err) {
    console.error('Unexpected delete error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    };
  }
};
