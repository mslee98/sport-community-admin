# 스포츠 커뮤니티 관리자 페이지

React + Tailwind CSS 4 + Vite로 구축된 스포츠 커뮤니티 관리자 대시보드

## 기술 스택

- **React 19** - UI 라이브러리
- **TypeScript** - 타입 안정성
- **Vite 6** - 빌드 도구
- **Tailwind CSS 3** - 스타일링
- **React Router DOM** - 라우팅
- **Lucide React** - 아이콘

## 시작하기

### 설치

```bash
npm install --legacy-peer-deps
```

### 개발 서버 실행

```bash
npm run dev
```

### 빌드

```bash
npm run build
```

## 주요 기능

- ✅ 반응형 레이아웃 (모바일/태블릿/데스크톱)
- ✅ 사이드바 네비게이션
- ✅ 대시보드 (통계 카드, 최근 활동)
- ✅ 회원 관리
- ✅ 커뮤니티 관리
- ✅ 게시물 관리
- ✅ 경기 관리
- ✅ 일정 관리
- ✅ 통계 분석
- ✅ 설정

## 프로젝트 구조

```
src/
├── components/
│   └── layout/
│       ├── Layout.tsx      # 메인 레이아웃
│       ├── Sidebar.tsx     # 사이드바 네비게이션
│       └── Header.tsx      # 헤더
├── pages/
│   ├── Dashboard.tsx       # 대시보드
│   ├── Users.tsx          # 회원 관리
│   ├── Community.tsx      # 커뮤니티 관리
│   ├── Posts.tsx          # 게시물 관리
│   ├── Matches.tsx        # 경기 관리
│   ├── Schedule.tsx       # 일정 관리
│   ├── Analytics.tsx      # 통계
│   └── Settings.tsx       # 설정
├── App.tsx                # 라우팅 설정
└── main.tsx              # 엔트리 포인트
```
