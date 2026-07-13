/** WindowItem에 실행할 수 있는 공통 action id. */
export type WindowItemActionId =
  "open" | "openLocation" | "pinToStart" | "unpinFromStart" | "pinToTaskbar" | "unpinFromTaskbar";

/** 선택한 WindowItem에 표시할 action의 visual 상태. */
export interface WindowItemActionState {
  /** true이면 action을 표시하되 실행할 수 없게 한다. */
  disabled?: boolean;
  id: WindowItemActionId;
}
