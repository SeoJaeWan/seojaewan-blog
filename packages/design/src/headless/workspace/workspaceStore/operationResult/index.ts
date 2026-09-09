/**
 * @file Workspace 명령의 변경 결과와 거부 사유를 정의한다.
 *
 * 현재 상태와 저장 처리는 WorkspaceStore가 소유한다.
 */
import type { WorkspaceState } from "../../model/index.js";

/**
 * Workspace 명령이 변경을 반영하지 않은 이유다.
 *
 * no-op은 오류가 아닌 변경 불필요 상태이며, 저장 실패는 WorkspaceStoreResult에서 별도로 표현한다.
 */
export type WorkspaceOperationFailureReason =
  /**
   * 생성한 Folder의 ID가 현재 Workspace 또는 연결된 정적 Catalog에 이미 존재한다.
   */
  | "duplicate-resource-id"
  /**
   * Folder 이동 경로가 자신에게 돌아오거나 이미 방문한 부모를 만나 순환한다.
   */
  | "folder-cycle"
  /**
   * 이름을 변경하려는 Folder가 현재 Workspace에 존재하지 않는다.
   */
  | "folder-not-found"
  /**
   * 요청한 이름 또는 parent가 현재 값과 같아 변경할 내용이 없다.
   */
  | "no-op"
  /**
   * 생성 또는 이동 대상으로 지정한 parent Folder가 존재하지 않는다. Desktop null은 허용한다.
   */
  | "parent-folder-not-found"
  /**
   * 이동할 ID의 placement는 있지만 입력 kind가 실제 저장된 Resource kind와 다르다.
   */
  | "resource-kind-mismatch"
  /**
   * 이동할 Resource의 placement가 없거나 Folder 원본이 존재하지 않는다.
   */
  | "resource-not-found"
  /**
   * 이동할 Resource ID에 대응하는 placement가 둘 이상이다.
   */
  | "resource-placement-not-unique"
  /**
   * Folder를 자기 자신의 자식으로 이동하려고 한다.
   */
  | "self-parent";

/**
 * Workspace 명령의 내부 계산이 만든 후보 상태 또는 거부 사유다.
 *
 * 후보 상태는 자동으로 현재 상태가 되지 않으며 Store의 commit이 반영과 알림 및 저장을 수행한다.
 */
export type WorkspaceOperationResult =
  | Readonly<{ ok: true; value: WorkspaceState }>
  | Readonly<{ ok: false; reason: WorkspaceOperationFailureReason }>;
