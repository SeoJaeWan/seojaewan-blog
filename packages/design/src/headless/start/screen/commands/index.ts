/**
 * @file Start screen snapshot의 atomic semantic transition을 정의한다.
 *
 * panel lifecycle routing, persistence와 DOM 표현은 각각 Operation, StartStore와 Component가 소유한다.
 */
import {
  createInitialStartScreenSnapshot,
  type StartScreenSnapshot,
  type StartScreenView,
} from "../model/index.js";

/** Start screen 명령이 만든 관찰 가능한 semantic 변화다. */
export type StartScreenChange =
  | Readonly<{ kind: "view-changed"; view: StartScreenView }>
  | Readonly<{ kind: "index-changed"; open: boolean }>
  | Readonly<{ kind: "reset" }>;

/** 새 snapshot commit과 identity-preserving no-op을 구분하는 immutable 명령 결과다. */
export type StartScreenCommandResult =
  | Readonly<{
      status: "changed";
      snapshot: StartScreenSnapshot;
      change: StartScreenChange;
    }>
  | Readonly<{
      status: "no-op";
      snapshot: StartScreenSnapshot;
      change: null;
    }>;

/** 새 snapshot과 change를 함께 동결한 changed 결과를 만든다. */
const changed = (
  snapshot: StartScreenSnapshot,
  change: StartScreenChange,
): StartScreenCommandResult =>
  Object.freeze({
    status: "changed",
    snapshot: Object.freeze(snapshot),
    change: Object.freeze(change),
  });

/** 입력 snapshot identity를 보존하는 immutable no-op 결과를 만든다. */
const noOp = (snapshot: StartScreenSnapshot): StartScreenCommandResult =>
  Object.freeze({ status: "no-op", snapshot, change: null });

/**
 * pinned 또는 all view를 선택하고 pinned로 돌아갈 때 열린 index를 함께 닫는다.
 *
 * 이미 요청한 canonical 상태이면 입력 snapshot identity를 유지한다.
 */
export const setStartScreenView = (
  snapshot: StartScreenSnapshot,
  view: StartScreenView,
): StartScreenCommandResult => {
  const indexOpen = view === "all" ? snapshot.indexOpen : false;
  if (snapshot.view === view && snapshot.indexOpen === indexOpen) return noOp(snapshot);
  return changed({ view, indexOpen }, { kind: "view-changed", view });
};

/**
 * all view에서 category index overlay의 열림 상태를 바꾼다.
 *
 * pinned view에서 index를 여는 요청과 현재 값과 같은 요청은 snapshot을 보존한다.
 */
export const setStartScreenIndexOpen = (
  snapshot: StartScreenSnapshot,
  open: boolean,
): StartScreenCommandResult => {
  if ((open && snapshot.view !== "all") || snapshot.indexOpen === open) return noOp(snapshot);
  return changed({ ...snapshot, indexOpen: open }, { kind: "index-changed", open });
};

/**
 * Start screen transient state를 pinned view와 닫힌 index로 초기화한다.
 *
 * 별도 `StartSnapshot`이나 Store를 입력받지 않으므로 persisted Pin을 변경할 수 없다.
 */
export const resetStartScreen = (snapshot: StartScreenSnapshot): StartScreenCommandResult => {
  if (snapshot.view === "pinned" && !snapshot.indexOpen) return noOp(snapshot);
  return changed(createInitialStartScreenSnapshot(), { kind: "reset" });
};
