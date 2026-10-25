// 창 기능(모든 앱 창이 공유하는 창 동작)의 공개 진입점이다.
export type { SnapAssistSuggestion } from './snap-assist';
export { SnapAssist } from './snap-assist';
export { SnapLayoutMenu } from './snap-layout-menu';
export { getThumbnailScale } from './window-geometry';
export { WindowLayer } from './window-layer';
export type {
  OpenWindow,
  TaskbarAppAction,
  TaskbarAppIndicator,
  WindowApp,
  WindowPlacement,
} from './window-rules';
export { getAppWindows, getTaskbarAppAction, getTaskbarAppIndicator } from './window-rules';
export { useWindowStore } from './window-store';
export { WindowThumbnail } from './window-thumbnail';
export type { RenderWindow, WindowFrameControls } from './window-view';
