import { useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadImage, deleteImage } from '../../services/fileUpload';

interface ImageUploadProps {
  onImageUpload: (fileSeq: string, fileUrl: string) => void;
  onImageRemove: () => void;
  currentImageUrl?: string;
  currentFileSeq?: string;
  accept?: string;
  maxSize?: number; // MB
  className?: string;
}

export const ImageUpload = ({
  onImageUpload,
  onImageRemove,
  currentImageUrl,
  currentFileSeq,
  accept: _accept = "image/*",
  maxSize = 5, // 5MB
  className = ""
}: ImageUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    // 파일 크기 검증
    if (file.size > maxSize * 1024 * 1024) {
      setError(`파일 크기는 ${maxSize}MB 이하여야 합니다.`);
      return;
    }

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      setError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setIsUploading(true);
    setError(null);

    try {
      const result = await uploadImage(file);
      
      if (result.success && result.fileSeq && result.fileUrl) {
        onImageUpload(result.fileSeq, result.fileUrl);
      } else {
        setError(result.error || '이미지 업로드에 실패했습니다.');
      }
    } catch (err) {
      setError('이미지 업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentFileSeq) return;

    try {
      const result = await deleteImage(currentFileSeq);
      
      if (result.success) {
        onImageRemove();
      } else {
        setError(result.error || '이미지 삭제에 실패했습니다.');
      }
    } catch (err) {
      setError('이미지 삭제 중 오류가 발생했습니다.');
    }
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleFileUpload(acceptedFiles[0]);
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': [],
      'image/jpeg': [],
      'image/jpg': [],
      'image/webp': [],
      'image/svg+xml': [],
      'image/gif': []
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 현재 이미지 표시 */}
      {currentImageUrl && (
        <div className="relative">
          <img
            src={currentImageUrl}
            alt="업로드된 이미지"
            className="w-full h-48 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
          />
          <button
            type="button"
            onClick={handleRemoveImage}
            className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* 드롭존 영역 */}
      {!currentImageUrl && (
        <div className="transition border border-gray-300 border-dashed cursor-pointer dark:hover:border-brand-500 dark:border-gray-700 rounded-xl hover:border-brand-500">
          <div
            {...getRootProps()}
            className={`dropzone rounded-xl border-dashed border-gray-300 p-7 lg:p-10 flex items-center justify-center min-h-[200px] ${
              isDragActive
                ? "border-brand-500 bg-gray-100 dark:bg-gray-800"
                : "border-gray-300 bg-gray-50 dark:border-gray-700 dark:bg-gray-900"
            }`}
          >
            {/* Hidden Input */}
            <input {...getInputProps()} />

            <div className="dz-message flex flex-col items-center justify-center m-0!">
              {/* Icon Container */}
              <div className="mb-[22px] flex justify-center">
                <div className="flex h-[68px] w-[68px] items-center justify-center rounded-full bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-400">
                  <svg
                    className="fill-current"
                    width="29"
                    height="28"
                    viewBox="0 0 29 28"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M14.5019 3.91699C14.2852 3.91699 14.0899 4.00891 13.953 4.15589L8.57363 9.53186C8.28065 9.82466 8.2805 10.2995 8.5733 10.5925C8.8661 10.8855 9.34097 10.8857 9.63396 10.5929L13.7519 6.47752V18.667C13.7519 19.0812 14.0877 19.417 14.5019 19.417C14.9161 19.417 15.2519 19.0812 15.2519 18.667V6.48234L19.3653 10.5929C19.6583 10.8857 20.1332 10.8855 20.426 10.5925C20.7188 10.2995 20.7186 9.82463 20.4256 9.53184L15.0838 4.19378C14.9463 4.02488 14.7367 3.91699 14.5019 3.91699ZM5.91626 18.667C5.91626 18.2528 5.58047 17.917 5.16626 17.917C4.75205 17.917 4.41626 18.2528 4.41626 18.667V21.8337C4.41626 23.0763 5.42362 24.0837 6.66626 24.0837H22.3339C23.5766 24.0837 24.5839 23.0763 24.5839 21.8337V18.667C24.5839 18.2528 24.2482 17.917 23.8339 17.917C23.4197 17.917 23.0839 18.2528 23.0839 18.667V21.8337C23.0839 22.2479 22.7482 22.5837 22.3339 22.5837H6.66626C6.25205 22.5837 5.91626 22.2479 5.91626 21.8337V18.667Z"
                    />
                  </svg>
                </div>
              </div>

              {/* Text Content */}
              <h4 className="mb-3 font-semibold text-gray-800 text-xl dark:text-white/90 text-center">
                {isDragActive ? "파일을 여기에 놓으세요" : "이미지를 드래그하여 업로드"}
              </h4>

              <span className="text-center mb-5 block w-full max-w-[290px] text-sm text-gray-700 dark:text-gray-400">
                PNG, JPG, WebP, SVG 이미지를 드래그하거나 클릭하여 선택하세요
              </span>

              <span className="font-medium underline text-sm text-brand-500 text-center">
                파일 선택
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 변경 버튼 (이미지가 있을 때) */}
      {currentImageUrl && (
        <button
          type="button"
          {...getRootProps()}
          disabled={isUploading}
          className="w-full px-4 py-2 text-sm font-medium text-brand-500 border border-brand-500 rounded-lg hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50"
        >
          {isUploading ? '업로드 중...' : '이미지 변경'}
        </button>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
          {error}
        </div>
      )}

      {/* 로딩 상태 */}
      {isUploading && (
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>이미지 업로드 중...</span>
        </div>
      )}
    </div>
  );
};
