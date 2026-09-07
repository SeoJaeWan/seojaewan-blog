/**
 * @file StartStore 명령의 commit, no-op, 거절과 저장 실패 결과를 정의한다.
 *
 * UI 알림과 presentation 완료 상태는 이 결과 계약의 책임이 아니다.
 */
import type { StartSnapshot } from "../../model/index.js";

/**
 * Start 명령이 새 immutable snapshot을 메모리에 반영하고 저장까지 마친 결과다.
 *
 * subscriber 알림은 완료됐지만 UI presentation 완료를 보장하지 않는다.
 */
export type StartStoreCommittedResult = Readonly<{
  ok: true;
  value: StartSnapshot;
}>;

/**
 * 유효한 요청이 현재 상태를 바꿀 필요가 없어서 아무 부수 효과도 만들지 않은 결과다.
 *
 * snapshot 교체, subscriber 알림과 storage save는 발생하지 않는다.
 */
export type StartStoreNoOpResult = Readonly<{
  ok: false;
  reason: "no-op";
}>;

/**
 * 입력 또는 현재 Catalog 상태가 Start 명령을 적용할 수 없어 거절된 사유다.
 *
 * no-op과 저장 실패는 각각 별도 결과로 구분한다.
 */
export type StartStoreRejectionReason =
  "invalid-resource-ref" | "resource-not-found" | "invalid-reorder-action";

/**
 * Start 명령을 적용하지 않아 현재 snapshot과 모든 부수 효과를 유지한 결과다.
 *
 * reason은 입력 구조, 현재 Resource 존재 여부 또는 지원하지 않는 이동 intent를 구분한다.
 */
export type StartStoreRejectedResult = Readonly<{
  ok: false;
  reason: StartStoreRejectionReason;
}>;

/**
 * semantic commit은 유지됐지만 전체 Start snapshot 저장이 실패한 결과다.
 *
 * 사용자 알림을 뜻하지 않으며, 다음 변경은 이 value를 포함한 최신 전체 목록을 다시 저장한다.
 */
export type StartStorePersistenceFailure = Readonly<{
  ok: false;
  reason: "storage-write-failed";
  committed: true;
  value: StartSnapshot;
}>;

/**
 * StartStore 초기화, 재읽기, reconcile과 mutation 명령의 모든 정상 반환 결과다.
 *
 * lifecycle 오류나 예상하지 못한 adapter 오류의 Promise rejection과는 구분된다.
 */
export type StartStoreResult =
  | StartStoreCommittedResult
  | StartStoreNoOpResult
  | StartStoreRejectedResult
  | StartStorePersistenceFailure;
