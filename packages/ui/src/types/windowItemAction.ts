/** WindowItem에 실행할 수 있는 공통 action id. */
export type WindowItemActionId =
  "open" | "openLocation" | "pinToStart" | "unpinFromStart" | "pinToTaskbar" | "unpinFromTaskbar";

/** 선택한 WindowItem에 표시할 action의 visual 상태. */
export interface WindowItemActionState {
  /** true이면 action을 표시하되 실행할 수 없게 한다. */
  disabled?: boolean;
  id: WindowItemActionId;
}

/** pinned WindowItem 순서를 Context Menu에서 변경할 때 사용하는 action id. */
export type WindowItemReorderActionId = "moveLeft" | "moveRight" | "moveToFront";

/** WindowItem Context Menu에서 실행할 수 있는 전체 action id. */
export type WindowItemContextActionId = WindowItemActionId | WindowItemReorderActionId;

/** 선택한 WindowItem Context Menu에 표시할 action의 visual 상태. */
export interface WindowItemContextActionState {
  /** true이면 action을 표시하되 실행할 수 없게 한다. */
  disabled?: boolean;
  id: WindowItemContextActionId;
}
