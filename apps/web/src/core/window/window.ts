// 창 기능(모든 앱 창이 공유하는 창 동작)의 공개 진입점이다.
export type { SnapAssistSuggestion } from './components/snap-assist/snap-assist';
export { SnapAssist } from './components/snap-assist/snap-assist';
export { SnapLayoutMenu } from './components/snap-layout-menu/snap-layout-menu';
export { WindowLayer } from './components/window-layer/window-layer';
export { WindowThumbnail } from './components/window-thumbnail/window-thumbnail';
export type { RenderWindow, WindowFrameControls } from './components/window-view/window-view';
export { useOpenApp } from './hooks/use-open-app/use-open-app';
export { getThumbnailScale } from './rules/window-geometry/window-geometry';
export type {
  OpenWindow,
  TaskbarAppAction,
  TaskbarAppIndicator,
  WindowApp,
  WindowPlacement,
} from './rules/window-rules/window-rules';
export {
  getAppWindows,
  getTaskbarAppAction,
  getTaskbarAppIndicator,
  getWindowRect,
} from './rules/window-rules/window-rules';
export { useWindowStore } from './stores/window-store/window-store';
