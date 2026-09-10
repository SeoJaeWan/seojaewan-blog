/** @file FolderViewSettingsStore 명령의 commit, no-op, 거절과 저장 실패 결과를 정의한다. */
import type { FolderViewSettingsSnapshot } from "../index.js";

/** runtime snapshot 변경과 필요한 저장을 완료한 결과다. */
export type FolderViewSettingsStoreCommittedResult = Readonly<{
  ok: true;
  value: FolderViewSettingsSnapshot;
}>;

/** 유효한 요청이 현재 상태와 같아 snapshot, 알림과 저장을 생략한 결과다. */
export type FolderViewSettingsStoreNoOpResult = Readonly<{
  ok: false;
  reason: "no-op";
}>;

/** malformed location, 변경 또는 surface를 snapshot 변화 없이 거절한 이유다. */
export type FolderViewSettingsStoreRejectionReason =
  | "invalid-action"
  | "invalid-folder-list"
  | "invalid-location"
  | "invalid-settings-change"
  | "invalid-surface";

/** 입력을 적용하지 않은 tagged 거절 결과다. */
export type FolderViewSettingsStoreRejectedResult = Readonly<{
  ok: false;
  reason: FolderViewSettingsStoreRejectionReason;
}>;

/** 메모리 commit은 유지됐지만 전체 위치별 설정 저장이 실패한 결과다. */
export type FolderViewSettingsStorePersistenceFailure = Readonly<{
  ok: false;
  reason: "storage-write-failed";
  committed: true;
  value: FolderViewSettingsSnapshot;
}>;

/** FolderViewSettingsStore가 정상적으로 반환하는 모든 결과다. */
export type FolderViewSettingsStoreResult =
  | FolderViewSettingsStoreCommittedResult
  | FolderViewSettingsStoreNoOpResult
  | FolderViewSettingsStoreRejectedResult
  | FolderViewSettingsStorePersistenceFailure;
