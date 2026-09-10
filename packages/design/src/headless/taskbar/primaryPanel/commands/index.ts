/**
 * @file Taskbar primary panel snapshot의 atomic semantic transition을 정의한다.
 *
 * switch 순서, UI completion 대기와 focus 처리는 후속 Operation과 Component가 소유한다.
 */
import type { PrimaryPanelId, PrimaryPanelSnapshot } from "../model/index.js";

/**
 * primary panel 명령이 만든 관찰 가능한 semantic 변화다.
 */
export type PrimaryPanelChange =
  /**
   * 비활성 상태에서 panel 하나가 active identity가 됐다.
   */
  | Readonly<{ kind: "activated"; panel: PrimaryPanelId }>
  /**
   * 현재 active identity가 제거됐으며 query는 close 완료까지 보존된다.
   */
  | Readonly<{ kind: "deactivated"; panel: PrimaryPanelId }>
  /**
   * 지정 panel의 controlled query가 사용자 입력 그대로 바뀌었다.
   */
  | Readonly<{ kind: "query-updated"; panel: PrimaryPanelId; query: string }>
  /**
   * 비활성 panel의 close 완료 뒤 해당 query가 초기화됐다.
   */
  | Readonly<{ kind: "query-reset"; panel: PrimaryPanelId }>;

/**
 * snapshot과 typed change를 함께 반환하는 primary panel 명령 결과다.
 */
export type PrimaryPanelCommandResult =
  /**
   * 명령이 새 immutable snapshot을 만들었다.
   */
  | Readonly<{
      status: "changed";
      snapshot: PrimaryPanelSnapshot;
      change: PrimaryPanelChange;
    }>
  /**
   * 현재 상태가 이미 요청 결과와 같아 snapshot을 그대로 보존했다.
   */
  | Readonly<{
      status: "no-op";
      snapshot: PrimaryPanelSnapshot;
      change: null;
    }>
  /**
   * 다른 panel이 active여서 겹치는 activation을 거절하고 snapshot을 보존했다.
   */
  | Readonly<{
      status: "rejected";
      snapshot: PrimaryPanelSnapshot;
      change: null;
      reason: "another-panel-active";
    }>;

/**
 * 바뀐 snapshot과 change를 재귀적으로 immutable한 명령 결과로 만든다.
 */
const changed = (
  snapshot: PrimaryPanelSnapshot,
  change: PrimaryPanelChange,
): PrimaryPanelCommandResult =>
  Object.freeze({
    status: "changed",
    snapshot: Object.freeze(snapshot),
    change: Object.freeze(change),
  });

/**
 * 입력 snapshot identity를 유지하는 부수 효과 없는 no-op 결과를 만든다.
 */
const noOp = (snapshot: PrimaryPanelSnapshot): PrimaryPanelCommandResult =>
  Object.freeze({ status: "no-op", snapshot, change: null });

/**
 * 입력 snapshot identity를 유지하면서 겹치는 activation 거절 이유를 반환한다.
 */
const rejectOverlappingActivation = (snapshot: PrimaryPanelSnapshot): PrimaryPanelCommandResult =>
  Object.freeze({
    status: "rejected",
    snapshot,
    change: null,
    reason: "another-panel-active",
  });

/**
 * 현재 비활성 상태에서 지정 panel을 유일한 active identity로 만든다.
 *
 * 같은 panel이면 no-op이고 다른 panel이 active면 순차 close 없이 교체하지 않고 거절한다.
 */
export const activatePrimaryPanel = (
  snapshot: PrimaryPanelSnapshot,
  panel: PrimaryPanelId,
): PrimaryPanelCommandResult => {
  if (snapshot.activePanel === panel) return noOp(snapshot);
  if (snapshot.activePanel !== null) return rejectOverlappingActivation(snapshot);
  return changed({ ...snapshot, activePanel: panel }, { kind: "activated", panel });
};

/**
 * 지정 panel이 현재 active일 때 identity만 제거하고 query를 보존한다.
 *
 * 닫혀 있거나 다른 panel이 active인 stale 요청은 해당 상태를 변경하지 않는다.
 */
export const deactivatePrimaryPanel = (
  snapshot: PrimaryPanelSnapshot,
  panel: PrimaryPanelId,
): PrimaryPanelCommandResult =>
  snapshot.activePanel === panel
    ? changed({ ...snapshot, activePanel: null }, { kind: "deactivated", panel })
    : noOp(snapshot);

/**
 * 지정 panel query를 trim이나 normalize 없이 교체해 IME 조합과 공백을 보존한다.
 *
 * active identity와 다른 panel query는 변경하지 않으며 동일 문자열은 no-op이다.
 */
export const updatePrimaryPanelQuery = (
  snapshot: PrimaryPanelSnapshot,
  panel: PrimaryPanelId,
  query: string,
): PrimaryPanelCommandResult => {
  const key = panel === "start" ? "startQuery" : "searchQuery";
  if (snapshot[key] === query) return noOp(snapshot);
  return changed({ ...snapshot, [key]: query }, { kind: "query-updated", panel, query });
};

/**
 * 비활성 panel의 close 완료를 반영해 해당 query만 빈 값으로 초기화한다.
 *
 * 같은 panel이 다시 active인 늦은 완료와 이미 빈 query는 no-op으로 보존한다.
 */
export const completePrimaryPanelClose = (
  snapshot: PrimaryPanelSnapshot,
  panel: PrimaryPanelId,
): PrimaryPanelCommandResult => {
  if (snapshot.activePanel === panel) return noOp(snapshot);
  const key = panel === "start" ? "startQuery" : "searchQuery";
  if (snapshot[key] === "") return noOp(snapshot);
  return changed({ ...snapshot, [key]: "" }, { kind: "query-reset", panel });
};
