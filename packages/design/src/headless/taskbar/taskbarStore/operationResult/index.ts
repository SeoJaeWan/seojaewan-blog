/**
 * @file TaskbarStore 명령의 commit, no-op, 거절과 저장 실패 결과를 정의한다.
 *
 * UI presentation과 실제 browser navigation 결과는 포함하지 않는다.
 */
import type { TaskbarSnapshot } from "../../model/index.js";

/**
 * 새 immutable Taskbar snapshot을 반영하고 필요한 저장까지 마친 결과다.
 */
export type TaskbarStoreCommittedResult = Readonly<{
  ok: true;
  value: TaskbarSnapshot;
}>;

/**
 * 현재 상태가 요청을 이미 만족해 snapshot, 알림과 저장을 생략한 결과다.
 */
export type TaskbarStoreNoOpResult = Readonly<{
  ok: false;
  reason: "no-op";
}>;

/**
 * 입력 identity 또는 reorder intent가 Taskbar 계약에 맞지 않아 거절된 이유다.
 */
export type TaskbarStoreRejectionReason =
  "invalid-taskbar-item" | "shortcut-not-found" | "invalid-reorder-action";

/**
 * semantic state를 바꾸지 않고 입력을 거절한 결과다.
 */
export type TaskbarStoreRejectedResult = Readonly<{
  ok: false;
  reason: TaskbarStoreRejectionReason;
}>;

/**
 * 메모리 commit은 유지됐지만 persistent Pin 저장이 실패한 결과다.
 */
export type TaskbarStorePersistenceFailure = Readonly<{
  ok: false;
  reason: "storage-write-failed";
  committed: true;
  value: TaskbarSnapshot;
}>;

/**
 * TaskbarStore 초기화, 재읽기, Window 연결과 mutation의 정상 반환 결과다.
 */
export type TaskbarStoreResult =
  | TaskbarStoreCommittedResult
  | TaskbarStoreNoOpResult
  | TaskbarStoreRejectedResult
  | TaskbarStorePersistenceFailure;
