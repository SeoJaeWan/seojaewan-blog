import type { ContentResourceRef, FolderResourceRef } from "../../../resources/index.js";

/**
 * 내부 WindowSession으로 여는 Folder와 Content Action이다.
 */
export type ResourceOpenWindowAction =
  | Readonly<{ type: "open-folder"; folder: FolderResourceRef }>
  | Readonly<{ type: "open-content"; content: ContentResourceRef }>;

/**
 * 외부 browser 새 context에서 URL을 여는 Action이다.
 */
export type ResourceOpenExternalAction = Readonly<{
  type: "open-external-shortcut";
  url: string;
  target: "_blank";
}>;

/**
 * Taskbar surface에서 실행할 수 있는 Resource open intent다.
 */
export type ResourceOpenAction = ResourceOpenWindowAction | ResourceOpenExternalAction;
