/**
 * @file WindowState의 공통 mode를 DOM-free Taskbar Root 읽기 모델로 투영한다.
 *
 * viewport 판정, Taskbar Pin 상태와 실제 DOM 배치는 이 요소가 소유하지 않는다.
 */
import type { WindowMode, WindowState } from "../../../windows/index.js";

/** Taskbar Root가 desktop/mobile 구성을 고르는 데 필요한 최소 읽기 모델이다. */
export type TaskbarRootSnapshot = Readonly<{
  /** WindowState가 이미 결정한 공통 responsive mode다. */
  mode: WindowMode;
}>;

/** SSR 준비 전 상태 또는 현재 Taskbar Root snapshot을 제공하는 읽기 모델이다. */
export type TaskbarRootViewModel =
  | Readonly<{ status: "not-ready"; snapshot: null }>
  | Readonly<{ status: "ready"; snapshot: TaskbarRootSnapshot }>;

/** Taskbar 제품 Root가 소비하는 읽기 전용 controller 결과다. */
export type TaskbarRootController = Readonly<{
  /** 공통 WindowState 준비 여부와 현재 mode를 구분한다. */
  viewModel: TaskbarRootViewModel;
}>;

/**
 * WindowState에서 Taskbar Root에 필요한 mode만 투영한다.
 *
 * 입력을 복사·동결하며 Window Session이나 frame 상태를 Root에 노출하지 않는다.
 */
export const selectTaskbarRootSnapshot = (windows: WindowState): TaskbarRootSnapshot =>
  Object.freeze({ mode: windows.mode });
