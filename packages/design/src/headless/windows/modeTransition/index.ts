/**
 * @file desktop과 mobile 사이의 WindowSession 정리 규칙을 계산한다.
 *
 * responsive adapter, browser 폭과 명시적 종료 후 복귀는 이 계산에 포함하지 않는다.
 */
import type { WindowMode, WindowSession, WindowState } from "../model/index.js";
import type { WindowSessionId } from "../windowSessionId/index.js";

/** stackingOrder에서 가장 위에 있는 visible Session을 찾는다. */
export const findTopVisibleSessionId = (
  sessions: readonly WindowSession[],
  stackingOrder: readonly WindowSessionId[],
): WindowSessionId | null => {
  const byId = new Map(sessions.map((session) => [session.id, session]));

  for (let index = stackingOrder.length - 1; index >= 0; index -= 1) {
    const id = stackingOrder[index];
    if (id !== undefined && byId.get(id)?.frame.minimized === false) return id;
  }

  return null;
};

/**
 * 현재 snapshot을 지정 모드로 전환한다.
 *
 * mobile 전환은 모든 minimized Session을 버리고 active visible Session 또는 최상위 visible
 * Session 하나만 남긴다. desktop 전환은 제거된 Session을 복원하지 않는다.
 */
export const transitionWindowMode = (state: WindowState, mode: WindowMode): WindowState | null => {
  if (state.mode === mode) return null;
  if (mode === "desktop") return { ...state, mode };

  const active = state.sessions.find(
    (session) => session.id === state.activeSessionId && !session.frame.minimized,
  );
  const keptId = active?.id ?? findTopVisibleSessionId(state.sessions, state.stackingOrder);
  if (keptId === null) {
    return { ...state, mode, sessions: [], stackingOrder: [], activeSessionId: null };
  }

  const kept = state.sessions.find((session) => session.id === keptId);
  if (kept === undefined) throw new Error("mobile 전환 대상 Session을 찾을 수 없습니다");

  return {
    ...state,
    mode,
    sessions: [{ ...kept, frame: { ...kept.frame, minimized: false } }],
    stackingOrder: [keptId],
    activeSessionId: keptId,
  };
};
