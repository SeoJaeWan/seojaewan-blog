/**
 * @file Taskbar primary panel snapshot에서 trigger intent와 panel별 read model을 파생한다.
 *
 * DOM focus 실행, switch completion과 실제 panel rendering은 이 selector가 소유하지 않는다.
 */
import type { PrimaryPanelId, PrimaryPanelSnapshot } from "../model/index.js";

/**
 * 현재 active identity에 따라 trigger가 요청해야 할 다음 제품 intent다.
 */
export type PrimaryPanelTriggerIntent =
  /**
   * 닫힌 상태에서 요청 panel을 연다.
   */
  | Readonly<{ kind: "open"; panel: PrimaryPanelId }>
  /**
   * active Start trigger를 다시 눌러 Start를 닫는다.
   */
  | Readonly<{ kind: "close"; panel: "start" }>
  /**
   * Search가 이미 active이므로 닫지 않고 UI의 기존 진입 상태를 유지한다.
   */
  | Readonly<{ kind: "maintain"; panel: "search" }>
  /**
   * 현재 panel close 완료 뒤 다른 panel을 열도록 순차 switch를 요청한다.
   */
  | Readonly<{ kind: "switch"; from: PrimaryPanelId; to: PrimaryPanelId }>;

/**
 * panel Component가 controlled 표시와 query에 필요한 최소 read model이다.
 */
export type PrimaryPanelView = Readonly<{
  panel: PrimaryPanelId;
  active: boolean;
  query: string;
}>;

/**
 * Start toggle과 Search 유지 정책을 현재 active identity에서 deterministic intent로 파생한다.
 *
 * `switch`는 순서를 기술할 뿐 snapshot을 직접 바꾸거나 animation 완료를 가정하지 않는다.
 */
export const selectPrimaryPanelTriggerIntent = (
  snapshot: PrimaryPanelSnapshot,
  panel: PrimaryPanelId,
): PrimaryPanelTriggerIntent => {
  if (snapshot.activePanel === null) return Object.freeze({ kind: "open", panel });
  if (snapshot.activePanel !== panel) {
    return Object.freeze({ kind: "switch", from: snapshot.activePanel, to: panel });
  }
  return panel === "start"
    ? Object.freeze({ kind: "close", panel })
    : Object.freeze({ kind: "maintain", panel });
};

/**
 * 지정 panel의 active 여부와 독립 query를 immutable read model로 반환한다.
 */
export const selectPrimaryPanelView = (
  snapshot: PrimaryPanelSnapshot,
  panel: PrimaryPanelId,
): PrimaryPanelView =>
  Object.freeze({
    panel,
    active: snapshot.activePanel === panel,
    query: panel === "start" ? snapshot.startQuery : snapshot.searchQuery,
  });
