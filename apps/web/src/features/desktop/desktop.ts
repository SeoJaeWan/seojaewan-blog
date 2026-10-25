// 바탕화면 기능의 공개 진입점이다.
// 서버 컴포넌트(`app/page.tsx`)가 가져오므로 값은 `'use client'` 경계인 Workspace만 내보낸다.
// 다른 컴포넌트를 내보내면 서버 쪽에서 디자인 시스템의 훅을 쓰는 모듈까지 불러와 빌드가 깨진다.
export type { DesktopIcon, DesktopIconKind, DesktopIconView } from './desktop-scene';
export { Workspace } from './workspace';
