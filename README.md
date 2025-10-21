# Sport Community Admin Dashboard

React + TypeScript + Tailwind CSS로 구축된 스포츠 커뮤니티 관리자 대시보드 템플릿입니다.

![Dashboard Preview](./docs/dashboard-preview.png)

## 주요 특징

- **기술 스택**: React 19 + TypeScript + Vite + Tailwind CSS
- **반응형**: 모바일, 태블릿, 데스크톱 지원
- **테마 전환**: 다크/라이트 모드 지원
- **차트 기능**: ApexCharts를 활용한 데이터 시각화
- **지도 기능**: 벡터 맵을 활용한 지역별 데이터 표시
- **모듈화된 구조**: 재사용 가능한 컴포넌트 설계
- **빠른 개발**: Vite의 HMR과 TypeScript 지원

## 기술 스택

### 핵심 프레임워크
- **React 19** - 최신 React 기능 활용
- **TypeScript** - 타입 안정성과 개발 생산성
- **Vite 6** - 빠른 빌드 도구와 개발 서버

### 스타일링 & UI
- **Tailwind CSS 4** - 유틸리티 퍼스트 CSS 프레임워크
- **Lucide React** - 아이콘 라이브러리
- **SVGR** - SVG를 React 컴포넌트로 변환

### 차트 & 시각화
- **ApexCharts 4.1.0** - 차트 라이브러리
- **React ApexCharts 1.7.0** - React용 ApexCharts 래퍼
- **@react-jvectormap** - 벡터 맵 컴포넌트

### 라우팅 & 상태 관리
- **React Router DOM 7** - 클라이언트 라우팅
- **React Helmet Async** - 메타데이터 관리
- **Context API** - 상태 관리

### 기타 유틸리티
- **clsx** - 클래스명 관리
- **tailwind-merge** - 클래스 충돌 해결
- **flatpickr** - 날짜 선택기
- **swiper** - 슬라이더

## 빠른 시작

### 1. 저장소 클론
```bash
git clone https://github.com/your-username/sport-community-admin.git
cd sport-community-admin
```

### 2. 환경 변수 설정
프로젝트 루트에 `.env.local` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# Supabase Configuration (로컬 개발용)
VITE_SUPABASE_URL=https://your-local-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_local_anon_key_here

# 애플리케이션 설정
VITE_APP_ENV=development
VITE_APP_NAME=Sport Community Admin
```

**운영환경용 설정**:
```bash
# Supabase Configuration (운영용)
VITE_SUPABASE_URL=https://your-production-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_production_anon_key_here

# 애플리케이션 설정
VITE_APP_ENV=production
VITE_APP_NAME=Sport Community Admin
```

### 3. 의존성 설치
```bash
npm install --legacy-peer-deps
```

### 4. 개발 서버 실행
```bash
npm run dev
```

### 5. 브라우저에서 확인
```
http://localhost:5173
```

## 프로젝트 구조

```
src/
├── components/           # 재사용 가능한 컴포넌트
│   ├── common/          # 공통 컴포넌트
│   │   ├── PageMeta.tsx
│   │   ├── ScrollToTop.tsx
│   │   └── ThemeToggleButton.tsx
│   └── ecommerce/       # 대시보드 전용 컴포넌트
│       ├── StatisticsChart.tsx
│       ├── MonthlyTarget.tsx
│       ├── RecentOrders.tsx
│       └── CountryMap.tsx
├── context/             # React Context
│   ├── ThemeContext.tsx
│   └── SidebarContext.tsx
├── layout/              # 레이아웃 컴포넌트
│   ├── AppLayout.tsx
│   ├── AppHeader.tsx
│   └── AppSidebar.tsx
├── pages/               # 페이지 컴포넌트
│   ├── Dashboard/
│   │   └── Home.tsx
│   └── OtherPage/
│       └── NotFound.tsx
├── icons/               # SVG 아이콘
│   └── index.ts
├── App.tsx              # 메인 앱 컴포넌트
└── main.tsx             # 엔트리 포인트
```

## 레이아웃 구조

### AppLayout
- **SidebarProvider**: 사이드바 상태 관리
- **AppSidebar**: 좌측 네비게이션 메뉴
- **AppHeader**: 상단 헤더 (테마 토글, 사용자 메뉴)
- **Backdrop**: 모바일 오버레이

### 대시보드 컴포넌트

#### StatisticsChart
```tsx
import StatisticsChart from './components/ecommerce/StatisticsChart';

<StatisticsChart />
```
- 다양한 차트 타입 지원 (라인, 바, 에리어)
- 실시간 데이터 업데이트
- 반응형 디자인

#### MonthlyTarget
```tsx
import MonthlyTarget from './components/ecommerce/MonthlyTarget';

<MonthlyTarget />
```
- 월별 목표 달성률 표시
- 프로그레스 바와 퍼센트 표시
- 커스터마이징 가능한 목표값

#### CountryMap
```tsx
import CountryMap from './components/ecommerce/CountryMap';

<CountryMap />
```
- 벡터 맵을 활용한 지역별 데이터 표시
- 호버 효과와 툴팁
- 커스터마이징 가능한 색상

### 공통 컴포넌트

#### PageMeta
```tsx
import { PageMeta } from './components/common/PageMeta';

<PageMeta 
  title="페이지 제목"
  description="페이지 설명"
/>
```

#### ThemeToggleButton
```tsx
import ThemeToggleButton from './components/common/ThemeToggleButton';

<ThemeToggleButton />
```

## 주요 기능

### 대시보드
- 실시간 통계 카드
- 월별 매출 차트
- 목표 달성률 추적
- 최근 주문 내역
- 인구 통계 카드
- 지역별 사용자 분포

### 테마 시스템
- 라이트/다크 테마 자동 전환
- 로컬 스토리지에 테마 설정 저장
- 시스템 테마 감지 지원

### 반응형 디자인
- 모바일 우선 설계
- 태블릿 및 데스크톱 최적화
- 유연한 그리드 시스템

### 지도 통합
- 벡터 맵을 활용한 데이터 시각화
- 지역별 통계 표시
- 인터랙티브 호버 효과

## 커스터마이징

### 테마 색상 변경
`src/index.css`에서 CSS 변수를 수정하여 색상을 변경할 수 있습니다:

```css
:root {
  --primary-color: #3b82f6;
  --secondary-color: #64748b;
  --accent-color: #f59e0b;
}
```

### 차트 설정 변경
각 차트 컴포넌트에서 ApexCharts 옵션을 수정하여 스타일을 변경할 수 있습니다:

```tsx
const chartOptions: ApexOptions = {
  chart: {
    type: 'line',
    height: 350,
  },
  colors: ['#3b82f6', '#ef4444'],
  // ... 기타 옵션
};
```

## 빌드 및 배포

### 프로덕션 빌드
```bash
npm run build
```

### 빌드 미리보기
```bash
npm run preview
```

### 정적 파일 서빙
빌드된 파일은 `dist/` 폴더에 생성되며, 모든 정적 파일 서버에서 호스팅할 수 있습니다.

## 커밋 규칙

### 기본 구조
```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type 종류
- **feat**: 새로운 기능 추가
- **fix**: 버그 수정
- **docs**: 문서 수정
- **style**: 코드 포맷팅, 세미콜론 누락 등
- **refactor**: 코드 리팩토링
- **test**: 테스트 코드 추가/수정
- **chore**: 빌드 과정, 패키지 매니저 설정 등
- **setup**: 프로젝트 초기 설정
- **config**: 설정 파일 변경

### Scope 예시
- **auth**: 인증 관련
- **ui**: UI 컴포넌트
- **api**: API 관련
- **db**: 데이터베이스
- **config**: 설정
- **deps**: 의존성

### 커밋 예시
```bash
# 기능 추가
feat(auth): Supabase 인증 시스템 구현

# 버그 수정
fix(ui): 사이드바 토글 버튼 클릭 이벤트 수정

# 문서 수정
docs: README에 커밋 규칙 추가

# 설정 변경
config: Tailwind CSS 4 설정 업데이트

# 의존성 추가
chore(deps): clsx, tailwind-merge 패키지 설치
```