/**
 * @file Resource와 최신 Workspace 위치를 기존 공개 open Action으로 변환한다.
 *
 * 실행·완료 판정과 recent 저장은 인접 Operation이 소유한다.
 */
import type { ResourceReaders, ResourceRef } from "../../../resources/index.js";
import type { WorkspaceState } from "../../../workspace/index.js";
import type { ResourceOpenAction } from "../model/index.js";

/**
 * ResourceRef를 내부 Window Action 또는 external browser intent로 변환한다.
 */
export const selectResourceOpenAction = (
  resource: ResourceRef,
  resources: ResourceReaders,
): ResourceOpenAction | null => {
  if (resource.kind === "folder") return Object.freeze({ type: "open-folder", folder: resource });
  if (resource.kind === "content") {
    return Object.freeze({ type: "open-content", content: resource });
  }
  const shortcut = resources.externalShortcut.get(resource.id);
  return shortcut === undefined
    ? null
    : Object.freeze({ type: "open-external-shortcut", url: shortcut.url, target: "_blank" });
};

/**
 * 실제 실행 intent와 성공 시 기록할 원본 ref를 함께 보존한다.
 *
 * Desktop은 Resource가 아니므로 recentResource가 null이다.
 */
export type SearchResourceOpenTarget = Readonly<{
  action: ResourceOpenAction;
  recentResource: ResourceRef | null;
}>;

/**
 * 실행 시 최신 placement의 부모 Folder 또는 Desktop을 선택한다.
 *
 * 외부 URL로 변환해도 원래 ref를 보존하며 없는 원본·배치는 실행하지 않는다.
 */
export const selectSearchResourceOpenTarget = (
  resource: ResourceRef,
  readers: ResourceReaders,
  workspace: WorkspaceState,
  intent: "search.open-resource" | "search.open-file-location",
): SearchResourceOpenTarget | null => {
  const reader =
    resource.kind === "content"
      ? readers.content
      : resource.kind === "folder"
        ? readers.folder
        : readers.externalShortcut;
  if (!reader.has(resource.id)) return null;
  if (intent === "search.open-file-location") {
    if (resource.kind !== "content") return null;
    const placement = workspace.placements.find(
      (entry) => entry.resource.kind === resource.kind && entry.resource.id === resource.id,
    );
    if (placement === undefined) return null;
    const parent = placement.parent;
    if (parent !== null && !readers.folder.has(parent.id)) return null;
    return Object.freeze({
      action:
        parent === null
          ? Object.freeze({ type: "create-file-explorer-window", location: null })
          : Object.freeze({ type: "open-folder", folder: parent }),
      recentResource: parent,
    });
  }
  const action = selectResourceOpenAction(resource, readers);
  return action === null
    ? null
    : Object.freeze({ action, recentResource: Object.freeze({ ...resource }) });
};
