// 창 기능(모든 앱 창이 공유하는 창 화면)의 공개 진입점이다.
// 열린 창 상태는 `shared/stores/window-store`, 창 규칙과 계산은 `shared/utils`에 있다.
export type { SnapAssistSuggestion } from './components/snap-assist/snap-assist';
export { SnapAssist } from './components/snap-assist/snap-assist';
export { SnapLayoutMenu } from './components/snap-layout-menu/snap-layout-menu';
export { WindowLayer } from './components/window-layer/window-layer';
