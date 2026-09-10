/**
 * @file Start screen의 in-memory transient snapshot과 commit 구독을 소유한다.
 *
 * Start Pin persistence, React lifecycle과 UI 표현은 이 state가 소유하지 않는다.
 */
import {
  resetStartScreen,
  setStartScreenIndexOpen,
  setStartScreenView,
  type StartScreenCommandResult,
} from "../commands/index.js";
import {
  createInitialStartScreenSnapshot,
  type StartScreenSnapshot,
  type StartScreenView,
} from "../model/index.js";

/** semantic commit 뒤 현재 Start screen snapshot을 다시 읽게 하는 subscriber다. */
export type StartScreenListener = () => void;

/** Start screen Operation과 controller가 공유하는 synchronous transient state 경계다. */
export type StartScreenState = Readonly<{
  /** 현재 commit된 immutable snapshot을 반환한다. */
  getSnapshot(): StartScreenSnapshot;
  /** listener를 등록하고 해당 listener만 제거하는 idempotent 함수를 반환한다. */
  subscribe(listener: StartScreenListener): () => void;
  /** pinned 또는 all view를 선택한다. */
  setView(view: StartScreenView): StartScreenCommandResult;
  /** all view의 category index overlay 열림 상태를 바꾼다. */
  setIndexOpen(open: boolean): StartScreenCommandResult;
  /** persisted Pin과 무관한 transient snapshot만 초기화한다. */
  reset(): StartScreenCommandResult;
}>;

/** changed 결과만 commit하고 no-op 결과는 snapshot identity와 알림을 보존한다. */
const commitResult = (
  result: StartScreenCommandResult,
  commit: (snapshot: StartScreenSnapshot) => void,
): StartScreenCommandResult => {
  if (result.status === "changed") commit(result.snapshot);
  return result;
};

/** 새 초기 snapshot과 독립 subscriber 집합을 가진 Start screen state를 만든다. */
export const createStartScreenState = (): StartScreenState => {
  let snapshot = createInitialStartScreenSnapshot();
  const listeners = new Set<StartScreenListener>();

  /** 새 snapshot을 먼저 반영하고 현재 listener 목록에 한 번씩 알린다. */
  const commit = (next: StartScreenSnapshot): void => {
    snapshot = next;
    for (const listener of [...listeners]) listener();
  };

  return Object.freeze({
    getSnapshot: (): StartScreenSnapshot => snapshot,
    subscribe: (listener: StartScreenListener): (() => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setView: (view: StartScreenView): StartScreenCommandResult =>
      commitResult(setStartScreenView(snapshot, view), commit),
    setIndexOpen: (open: boolean): StartScreenCommandResult =>
      commitResult(setStartScreenIndexOpen(snapshot, open), commit),
    reset: (): StartScreenCommandResult => commitResult(resetStartScreen(snapshot), commit),
  });
};
