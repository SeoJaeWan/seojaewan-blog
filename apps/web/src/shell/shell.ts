// shell(화면 배치, 앱 등록표, 재부팅 화면)의 공개 진입점이다.
// 서버 컴포넌트(`app/page.tsx`)가 가져오므로 값은 `'use client'` 경계인 Shell만 내보낸다.
// 다른 컴포넌트를 내보내면 서버 쪽에서 디자인 시스템의 훅을 쓰는 모듈까지 불러와 빌드가 깨진다.
export { Shell } from './components/shell/shell';
