import PageBreadcrumb from "../../components/common/PageBreadCrumb.tsx";
import ComponentCard from "../../components/common/ComponentCard.tsx";
import { PageMeta } from "../../components/common/PageMeta.tsx";
import { SiteManagementTable } from "../../components/SiteManagement";
import ImageUploadTest from "../../components/ImageUploadTest";

export default function SiteManagement() {
  return (
    <>
      <PageMeta
        title="사이트 관리 | 스포츠 커뮤니티 관리자"
        description="사이트 관리 페이지 - 사이트 설정, 메뉴 관리, 콘텐츠 관리를 수행합니다."
      />
      <PageBreadcrumb pageTitle="사이트 관리" />
      <div className="space-y-6">
        {/* <ComponentCard title="이미지 업로드 테스트">
          <ImageUploadTest />
        </ComponentCard> */}

        <ComponentCard title="사이트 관리 테이블">
          <SiteManagementTable />
        </ComponentCard>
      </div>
    </>
  );
}