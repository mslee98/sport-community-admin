import { useState } from 'react';
import { uploadImage, debugEnvVars, debugSupabaseConnection } from '../services/fileUpload';

const ImageUploadTest = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string | null>(null);

  const handleConnectionTest = async () => {
    try {
      debugEnvVars();
      await debugSupabaseConnection();
      setConnectionStatus('연결 상태 확인 완료 - 콘솔을 확인하세요');
    } catch (err) {
      setConnectionStatus('연결 상태 확인 실패');
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setError(null);
    setResult(null);

    try {
      // 환경 변수 디버깅
      debugEnvVars();
      
      // Supabase 연결 상태 디버깅
      await debugSupabaseConnection();
      
      console.log('업로드 시작:', file.name, file.size, file.type);
      
      const uploadResult = await uploadImage(file);
      
      console.log('업로드 결과:', uploadResult);
      setResult(uploadResult);
      
      if (!uploadResult.success) {
        setError(uploadResult.error || '업로드 실패');
      }
    } catch (err) {
      console.error('업로드 에러:', err);
      setError('업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        이미지 업로드 테스트
      </h2>
      
      <div className="space-y-4">
        <div>
          <button
            type="button"
            onClick={handleConnectionTest}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors mb-4"
          >
            Supabase 연결 상태 확인
          </button>
          {connectionStatus && (
            <div className="text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg mb-4">
              {connectionStatus}
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            이미지 파일 선택
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-50 file:text-brand-700 hover:file:bg-brand-100 dark:file:bg-brand-900 dark:file:text-brand-300"
          />
        </div>

        {isUploading && (
          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>업로드 중...</span>
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
            {error}
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              업로드 결과:
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded">
              <pre>{JSON.stringify(result, null, 2)}</pre>
            </div>
            
            {result.success && result.fileUrl && (
              <div className="mt-4">
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  업로드된 이미지:
                </div>
                <img
                  src={result.fileUrl}
                  alt="업로드된 이미지"
                  className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageUploadTest;
