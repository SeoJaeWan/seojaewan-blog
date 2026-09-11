import type {
  FileExplorerExecution,
  FileExplorerInlineEditRequest,
  FileExplorerLocation,
  FileExplorerSidebarItem,
} from "../../../../../../../headless/folders/index.js";
import type { ResourceId } from "../../../../../../../headless/resources/index.js";
import type {
  WorkspaceCommittedResult,
  WorkspaceOperationHandle,
} from "../../../../../../../headless/workspace/index.js";
import { sameLocation } from "../sidebarRow/index.js";

/**
 * create와 rename 입력이 공유하는 수정 가능한 UI draft다.
 */
export type InlineDraft =
  | Readonly<{
      kind: "create";
      parent: FileExplorerLocation;
      value: string;
      error: string | null;
      submitting: boolean;
    }>
  | Readonly<{
      kind: "rename";
      folder: Exclude<FileExplorerLocation, null>;
      value: string;
      error: string | null;
      submitting: boolean;
    }>;

/**
 * Controller 실행 결과를 inline edit 시작 요청으로 좁힌다.
 */
export const isInlineRequest = (
  value: FileExplorerExecution,
): value is FileExplorerInlineEditRequest =>
  "status" in value && value.status === "inline-edit-request";

/**
 * Controller 실행 결과를 Workspace commit handle로 좁힌다.
 */
export const isWorkspaceHandle = (
  value: FileExplorerExecution,
): value is WorkspaceOperationHandle => "committed" in value;

/**
 * Workspace 거절 사유를 inline editor의 사용자 메시지로 변환한다.
 */
export const editableError = (result: WorkspaceCommittedResult): string | null => {
  if (result.status !== "rejected") return null;
  if (!result.result.ok) {
    switch (result.result.reason) {
      case "folder-name-empty":
        return "폴더 이름을 입력하세요.";
      case "folder-name-too-long":
        return "폴더 이름은 255자 이하여야 합니다.";
      case "folder-name-invalid-character":
        return "폴더 이름에 사용할 수 없는 문자가 있습니다.";
      case "folder-name-relative-segment":
      case "folder-name-reserved":
        return "이 폴더 이름은 사용할 수 없습니다.";
      case "folder-name-trailing-space-or-period":
        return "폴더 이름은 공백이나 마침표로 끝날 수 없습니다.";
      case "folder-name-conflict":
        return "같은 위치에 같은 이름의 폴더가 있습니다.";
      default:
        return "폴더를 변경할 수 없습니다.";
    }
  }
  return "폴더를 변경할 수 없습니다.";
};

/**
 * Headless create 또는 rename 요청을 수정 가능한 local draft로 바꾼다.
 */
export const createDraft = (request: FileExplorerInlineEditRequest): InlineDraft =>
  request.kind === "create"
    ? {
        kind: "create",
        parent: request.parent,
        value: request.initialName,
        error: null,
        submitting: false,
      }
    : {
        kind: "rename",
        folder: request.folder,
        value: request.initialName,
        error: null,
        submitting: false,
      };

/**
 * 접힌 하위 항목을 포함해 현재 Sidebar가 알고 있는 Folder identity를 수집한다.
 */
export const collectFolderIds = (
  items: readonly FileExplorerSidebarItem[],
  target = new Set<ResourceId>(),
): ReadonlySet<ResourceId> => {
  for (const item of items) {
    target.add(item.ref.id);
    collectFolderIds(item.children, target);
  }
  return target;
};

/**
 * Workspace commit에서 요청 전에는 없었던 동일 parent의 새 Folder identity를 찾는다.
 */
export const findCreatedFolderId = (
  committed: WorkspaceCommittedResult,
  existingIds: ReadonlySet<ResourceId>,
  parent: FileExplorerLocation,
): ResourceId | null => {
  if (committed.status !== "committed") return null;
  const placement = committed.value.placements.find(
    ({ parent: candidateParent, resource }) =>
      resource.kind === "folder" &&
      !existingIds.has(resource.id) &&
      sameLocation(candidateParent, parent),
  );
  return placement?.resource.kind === "folder" ? placement.resource.id : null;
};
