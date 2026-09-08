/** Taskbar Root에서 Windows trigger를 실행한 제품 intent다. */
export type TaskbarRootAction = Readonly<{ type: "request-windows" }>;

/** Taskbar Root Action을 panel 소유자에게 전달하는 단일 제품 gateway다. */
export type TaskbarRootActionGateway = Readonly<{
  /** serializable Root Action을 정확히 한 번 전달하며 panel 상태를 대신 계산하지 않는다. */
  execute(action: TaskbarRootAction): void;
}>;

/**
 * Windows trigger 입력을 panel 구현과 독립적인 제품 Action으로 만든다.
 *
 * Search Action은 해당 요소가 구현될 때 별도 case로 추가한다.
 */
export const createTaskbarWindowsAction = (): TaskbarRootAction =>
  Object.freeze({ type: "request-windows" });
