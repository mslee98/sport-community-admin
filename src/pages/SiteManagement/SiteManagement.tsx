import PageBreadcrumb from "../../components/common/PageBreadCrumb.tsx";
import ComponentCard from "../../components/common/ComponentCard.tsx";
import { PageMeta } from "../../components/common/PageMeta.tsx";
import { UserManagementTable } from "../../components/UserManagement";

export default function SiteManagement() {
  return (
    <>
      <PageMeta
        title="회원 관리 | 스포츠 커뮤니티 관리자"
        description="회원 관리 페이지 - 회원의 권한, 포인트, 경험치, 승인여부를 관리합니다."
      />
      <PageBreadcrumb pageTitle="사이트 관리" />
      <div className="space-y-6">

        <ComponentCard title="사이트 관리 테이블">
          <UserManagementTable />
        </ComponentCard>
      </div>
    </>
  );
}
