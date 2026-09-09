/**
 * @file Taskbar Root의 진입 intent와 primary panel identity 투영을 정의한다.
 *
 * panel 상태, widget lifecycle과 실제 DOM은 이 Action 요소가 소유하지 않는다.
 */
import type { PrimaryPanelId } from "../../primaryPanel/model/index.js";

/** Taskbar Root의 Windows trigger 입력을 panel 소유자에게 전달하는 제품 intent다. */
export type TaskbarWindowsAction = Readonly<{ type: "request-windows" }>;

/** Taskbar Root의 Search trigger 입력을 panel 소유자에게 전달하는 제품 intent다. */
export type TaskbarSearchAction = Readonly<{ type: "request-search" }>;

/** Taskbar Root의 각 trigger 입력을 대상별로 구분하는 제품 Action이다. */
export type TaskbarRootAction = TaskbarWindowsAction | TaskbarSearchAction;

/** Taskbar Root Action을 panel 소유자에게 전달하는 단일 제품 gateway다. */
export type TaskbarRootActionGateway = Readonly<{
  /** serializable Root Action을 정확히 한 번 전달하며 panel 상태를 대신 계산하지 않는다. */
  execute(action: TaskbarRootAction): void;
}>;

/**
 * Windows trigger 입력을 panel 구현과 독립적인 제품 Action으로 만든다.
 *
 * 같은 gateway를 쓰는 Search 요청과 구분되도록 고정된 case를 반환한다.
 */
export const createTaskbarWindowsAction = (): TaskbarWindowsAction =>
  Object.freeze({ type: "request-windows" });

/**
 * Search trigger 입력을 panel 구현과 독립적인 제품 Action으로 만든다.
 *
 * query, recent와 panel focus는 후속 Search panel이 소유하며 이 Action에는 포함하지 않는다.
 */
export const createTaskbarSearchAction = (): TaskbarSearchAction =>
  Object.freeze({ type: "request-search" });

/**
 * 기존 Taskbar Root Action을 같은 의미의 primary panel identity trigger 대상으로 투영한다.
 *
 * Root controller가 외부 gateway에 selected/query 상태를 복제하지 않고 현재 panel Operation을 실행할 때
 * 사용하며, widget open·focus·animation 상태는 계산하지 않는다.
 */
export const selectTaskbarRootPrimaryPanel = (action: TaskbarRootAction): PrimaryPanelId =>
  action.type === "request-windows" ? "start" : "search";
