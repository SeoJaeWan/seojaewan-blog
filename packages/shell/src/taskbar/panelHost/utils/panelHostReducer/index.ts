import type { TaskbarPanelContainerState } from "@window/ui";

/** Host가 완료 신호를 검증하는 taskbar panel transition phase. */
export type TaskbarPanelTransitionState = Exclude<TaskbarPanelContainerState, "open">;

export interface TaskbarPanelHostState {
  activePanelId: string | null;
  panelStates: Record<string, TaskbarPanelContainerState>;
}

export type TaskbarPanelHostAction =
  | { panelId: string; type: "open" }
  | { panelId: string | undefined; type: "close" }
  | {
      panelId: string;
      state: TaskbarPanelTransitionState;
      type: "completeTransition";
    }
  | { type: "settleTransitions" };

export const INITIAL_HOST_STATE: TaskbarPanelHostState = {
  activePanelId: null,
  panelStates: {},
};

/**
 * 하나 이상의 panel이 opening 또는 closing phase인지 확인한다.
 *
 * @param panelStates panel ID별 현재 visual phase
 * @returns 완료되지 않은 transition이 있으면 true
 */
export const hasTransitioningPanel = (panelStates: TaskbarPanelHostState["panelStates"]) =>
  Object.values(panelStates).some((state) => state !== "open");

/**
 * Taskbar panel의 활성 상태와 visual transition phase를 action에 따라 전이한다.
 * transition 중인 panel이 있으면 추가 open과 close 요청을 무시한다.
 *
 * @param state 현재 panel host 상태
 * @param action panel 열기, 닫기 또는 transition 완료 action
 * @returns action을 반영한 다음 panel host 상태
 */
export const taskbarPanelHostReducer = (
  state: TaskbarPanelHostState,
  action: TaskbarPanelHostAction,
): TaskbarPanelHostState => {
  if (action.type === "open") {
    if (hasTransitioningPanel(state.panelStates) || state.activePanelId === action.panelId) {
      return state;
    }

    const panelStates = { ...state.panelStates };

    if (state.activePanelId !== null) {
      panelStates[state.activePanelId] = "closing";
    }

    panelStates[action.panelId] = "opening";

    return { activePanelId: action.panelId, panelStates };
  }

  if (action.type === "close") {
    if (hasTransitioningPanel(state.panelStates)) {
      return state;
    }

    const panelId = action.panelId ?? state.activePanelId;

    if (panelId === null || panelId !== state.activePanelId) {
      return state;
    }

    return {
      activePanelId: null,
      panelStates: { ...state.panelStates, [panelId]: "closing" },
    };
  }

  if (action.type === "completeTransition") {
    if (state.panelStates[action.panelId] !== action.state) {
      return state;
    }

    const panelStates = { ...state.panelStates };

    if (action.state === "opening") {
      panelStates[action.panelId] = "open";
    } else {
      delete panelStates[action.panelId];
    }

    return { ...state, panelStates };
  }

  if (!hasTransitioningPanel(state.panelStates)) {
    return state;
  }

  const panelStates = Object.fromEntries(
    Object.entries(state.panelStates).flatMap(([panelId, panelState]) =>
      panelState === "closing" ? [] : [[panelId, "open" as const]],
    ),
  );

  return {
    activePanelId:
      state.activePanelId !== null && panelStates[state.activePanelId] === "open"
        ? state.activePanelId
        : null,
    panelStates,
  };
};
