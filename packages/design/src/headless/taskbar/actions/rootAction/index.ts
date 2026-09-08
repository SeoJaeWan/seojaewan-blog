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
