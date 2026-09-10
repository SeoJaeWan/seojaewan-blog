/**
 * @file Taskbar primary panel의 in-memory semantic snapshot과 commit 구독을 소유한다.
 *
 * persistence, React lifecycle, DOM과 animation completion은 이 state가 소유하지 않는다.
 */
import {
  activatePrimaryPanel,
  completePrimaryPanelClose,
  deactivatePrimaryPanel,
  type PrimaryPanelCommandResult,
  updatePrimaryPanelQuery,
} from "../commands/index.js";
import {
  createInitialPrimaryPanelSnapshot,
  type PrimaryPanelId,
  type PrimaryPanelSnapshot,
} from "../model/index.js";

/**
 * semantic commit 뒤 현재 snapshot을 다시 읽을 수 있게 알리는 subscriber다.
 */
export type PrimaryPanelListener = () => void;

/**
 * primary panel Operation과 controller가 공유하는 synchronous state 경계다.
 *
 * 각 명령은 changed, no-op과 거절을 구분하며 changed일 때만 subscriber를 호출한다.
 */
export type PrimaryPanelState = Readonly<{
  /** 현재 commit된 immutable primary panel snapshot을 반환한다. */
  getSnapshot(): PrimaryPanelSnapshot;
  /** semantic commit 알림을 등록하고 해당 listener만 제거하는 함수를 반환한다. */
  subscribe(listener: PrimaryPanelListener): () => void;
  /** 비활성 상태에서 지정 panel을 active로 만들고 겹치는 activation은 거절한다. */
  activate(panel: PrimaryPanelId): PrimaryPanelCommandResult;
  /** 현재 active인 지정 panel identity를 제거하되 query는 유지한다. */
  deactivate(panel: PrimaryPanelId): PrimaryPanelCommandResult;
  /** 지정 panel의 controlled query를 입력 문자열 그대로 반영한다. */
  updateQuery(panel: PrimaryPanelId, query: string): PrimaryPanelCommandResult;
  /** 비활성 panel의 close 완료 뒤 해당 query만 초기화한다. */
  completeClose(panel: PrimaryPanelId): PrimaryPanelCommandResult;
}>;

/**
 * command 결과를 보존하고 changed snapshot만 commit한 뒤 subscriber에게 알린다.
 */
const commitResult = (
  result: PrimaryPanelCommandResult,
  commit: (snapshot: PrimaryPanelSnapshot) => void,
): PrimaryPanelCommandResult => {
  if (result.status === "changed") commit(result.snapshot);
  return result;
};

/**
 * 새 초기 snapshot과 독립 subscriber 집합을 가진 primary panel state를 만든다.
 *
 * 여러 runtime이 서로 상태를 공유하지 않으며 no-op과 거절에서는 snapshot identity와 알림을 보존한다.
 */
export const createPrimaryPanelState = (): PrimaryPanelState => {
  let snapshot = createInitialPrimaryPanelSnapshot();
  const listeners = new Set<PrimaryPanelListener>();

  /** 새 snapshot을 먼저 commit하고 현재 등록된 listener 목록에 한 번씩 알린다. */
  const commit = (next: PrimaryPanelSnapshot): void => {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };

  return Object.freeze({
    /** 현재 commit된 snapshot identity를 반환한다. */
    getSnapshot: (): PrimaryPanelSnapshot => snapshot,
    /** listener를 등록하고 여러 번 호출해도 안전한 해제 함수를 반환한다. */
    subscribe: (listener: PrimaryPanelListener): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    /** activation 명령을 최신 snapshot에 적용한다. */
    activate: (panel: PrimaryPanelId): PrimaryPanelCommandResult =>
      commitResult(activatePrimaryPanel(snapshot, panel), commit),
    /** deactivation 명령을 최신 snapshot에 적용한다. */
    deactivate: (panel: PrimaryPanelId): PrimaryPanelCommandResult =>
      commitResult(deactivatePrimaryPanel(snapshot, panel), commit),
    /** query 변경 명령을 최신 snapshot에 적용한다. */
    updateQuery: (panel: PrimaryPanelId, query: string): PrimaryPanelCommandResult =>
      commitResult(updatePrimaryPanelQuery(snapshot, panel, query), commit),
    /** close 완료 명령을 최신 snapshot에 적용한다. */
    completeClose: (panel: PrimaryPanelId): PrimaryPanelCommandResult =>
      commitResult(completePrimaryPanelClose(snapshot, panel), commit),
  });
};
