/**
 * @file WindowState의 공통 mode를 DOM-free Taskbar Root 읽기 모델로 투영한다.
 *
 * viewport 판정, Taskbar Pin 상태와 실제 DOM 배치는 이 요소가 소유하지 않는다.
 */
import type { WindowMode, WindowState } from "../../../windows/index.js";
import type { TaskbarRootActionGateway } from "../../actions/rootAction/index.js";
import type { TaskbarApplicationId } from "../../model/index.js";
import {
  type MobileTaskbarView,
  selectMobileTaskbarView,
} from "../../selectors/index.js";

/** Taskbar Root가 desktop/mobile 구성을 고르는 데 필요한 최소 읽기 모델이다. */
export type TaskbarRootSnapshot = Readonly<{
  /** WindowState가 이미 결정한 공통 responsive mode다. */
  mode: WindowMode;
  /** desktop Pin과 독립된 mobile 고정 application·Timestamp 순서다. */
  mobileView: MobileTaskbarView;
}>;

/** SSR 준비 전 상태 또는 현재 Taskbar Root snapshot을 제공하는 읽기 모델이다. */
export type TaskbarRootViewModel =
  | Readonly<{ status: "not-ready"; snapshot: null }>
  | Readonly<{ status: "ready"; snapshot: TaskbarRootSnapshot }>;

/** Taskbar Root 입력을 각 기존 제품 실행 경계로 전달하는 controller Action이다. */
export type TaskbarRootControllerActions = Readonly<{
  /** Windows·Search trigger의 구분된 제품 Action을 panel 소유자에게 전달한다. */
  execute: TaskbarRootActionGateway["execute"];
  /** mobile application intent를 기존 Window Operation에 전달하고 UI에서 결과를 재판정하지 않는다. */
  launchMobileApplication(applicationId: TaskbarApplicationId): void;
}>;

/** Taskbar 제품 Root가 소비하는 읽기 전용 controller 결과다. */
export type TaskbarRootController = Readonly<{
  /** 공통 WindowState 준비 여부와 현재 mode를 구분한다. */
  viewModel: TaskbarRootViewModel;
  /** Root trigger와 mobile application 입력을 각 기존 실행 경계에 전달한다. */
  actions: TaskbarRootControllerActions;
}>;

/**
 * WindowState에서 Taskbar Root의 mode와 mobile 고정 구성을 투영한다.
 *
 * 입력을 복사·동결하며 Window frame이나 mobile 실행 정책을 Root에 노출하지 않는다.
 */
export const selectTaskbarRootSnapshot = (windows: WindowState): TaskbarRootSnapshot =>
  Object.freeze({ mode: windows.mode, mobileView: selectMobileTaskbarView(windows) });
