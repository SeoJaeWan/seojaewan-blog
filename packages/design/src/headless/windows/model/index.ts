/**
 * @file Window frame, 앱별 Session union과 전역 runtime WindowState를 정의한다.
 *
 * 상태 변경, ID 발급과 maximized bounds 계산은 별도 Window 요소가 소유한다.
 */
import type { ChromeTab, ChromeTabId } from "../../chrome/index.js";
import type { FileExplorerTab, FileExplorerTabId } from "../../folders/index.js";
import type { WindowSessionId } from "../windowSessionId/index.js";

/**
 * 숫자 좌표로 표현한 Window의 기준점이다.
 */
export type WindowPoint = Readonly<{
  x: number;
  y: number;
}>;

/**
 * 숫자 너비와 높이로 표현한 Window 크기다.
 */
export type WindowSize = Readonly<{
  width: number;
  height: number;
}>;

/**
 * 숫자 좌표와 크기로 표현한 사각형이다.
 */
export type WindowRect = Readonly<WindowPoint & WindowSize>;

/**
 * WindowStore가 명시적 responsive 명령으로 관리하는 실행 모드다.
 */
export type WindowMode = "desktop" | "mobile";

/**
 * normal bounds와 maximize·minimize 상태를 분리해 보존한다.
 *
 * maximized 상태의 실제 bounds는 현재 `workArea`에서 파생한다.
 */
export type WindowFrameState = Readonly<{
  normalBounds: WindowRect;
  placement: "normal" | "maximized";
  minimized: boolean;
}>;

/**
 * 모든 앱 WindowSession이 공유하는 runtime identity와 frame 상태다.
 */
export type WindowSessionBase = Readonly<{
  id: WindowSessionId;
  frame: WindowFrameState;
}>;

/**
 * 하나의 File Explorer Window와 그 tab collection을 나타낸다.
 *
 * Folder Resource 자체와 Workspace 배치는 포함하지 않는다.
 */
export type FileExplorerWindowSession = Readonly<
  WindowSessionBase & {
    kind: "file-explorer";
    applicationId: "file-explorer";
    tabs: readonly FileExplorerTab[];
    activeTabId: FileExplorerTabId;
  }
>;

/**
 * 하나의 Chrome Window와 그 tab collection을 나타낸다.
 *
 * Content 원본과 browser router 객체는 포함하지 않는다.
 */
export type ChromeWindowSession = Readonly<
  WindowSessionBase & {
    kind: "chrome";
    applicationId: "chrome";
    tabs: readonly ChromeTab[];
    activeTabId: ChromeTabId;
  }
>;

/**
 * 현재 지원하는 File Explorer 또는 Chrome WindowSession이다.
 *
 * 앱별 불가능한 tab 조합은 discriminant와 전용 tab type으로 분리한다.
 */
export type WindowSession = FileExplorerWindowSession | ChromeWindowSession;

/**
 * 실행 중인 WindowSession과 stacking·active 상태의 전체 snapshot이다.
 *
 * browser reload 뒤 복원하지 않으며 Resource·Workspace 영속 상태를 포함하지 않는다.
 */
export type WindowState = Readonly<{
  mode: WindowMode;
  workArea: WindowRect;
  sessions: readonly WindowSession[];
  stackingOrder: readonly WindowSessionId[];
  activeSessionId: WindowSessionId | null;
}>;
