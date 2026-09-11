import type { ResourceReaders, ResourceRef } from "../../../resources/index.js";
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
