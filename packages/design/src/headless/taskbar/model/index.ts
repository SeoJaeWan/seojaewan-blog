/**
 * @file Taskbar Pin identity, runtime visible order와 reorder intent를 정의한다.
 *
 * Resource metadata, Window target과 browser interaction은 저장하지 않는다.
 */
import { type ExternalShortcutResourceRef, parseResourceRef } from "../../resources/index.js";

/**
 * Taskbar가 하나의 Group으로 다루는 concrete application identity다.
 */
export type TaskbarApplicationId = "file-explorer" | "chrome";

/**
 * application Group을 metadata 없이 참조하는 Taskbar identity다.
 */
export type TaskbarApplicationItem = Readonly<{
  kind: "application";
  applicationId: TaskbarApplicationId;
}>;

/**
 * standalone ExternalShortcut launcher를 ResourceRef로 참조하는 Taskbar identity다.
 */
export type TaskbarExternalShortcutItem = Readonly<{
  kind: "external-shortcut";
  resource: ExternalShortcutResourceRef;
}>;

/**
 * Taskbar가 Pin 또는 visible sequence에서 식별할 수 있는 항목이다.
 *
 * Content와 Folder는 Taskbar identity에 포함되지 않는다.
 */
export type TaskbarItem = TaskbarApplicationItem | TaskbarExternalShortcutItem;

/**
 * Taskbar persistent Pin과 runtime visible order를 함께 읽는 immutable snapshot이다.
 *
 * `pinnedItems`는 저장 대상이고 `visibleItems`는 실행 중인 unpinned application도 포함한다.
 */
export type TaskbarSnapshot = Readonly<{
  pinnedItems: readonly TaskbarItem[];
  visibleItems: readonly TaskbarItem[];
}>;

/**
 * Context Menu가 현재 visible 항목을 상대적으로 이동하는 intent다.
 */
export type TaskbarReorderAction = "first" | "left" | "right";

/**
 * drag가 지정한 visible sequence의 0-based 최종 위치다.
 */
export type TaskbarReorderDestination = Readonly<{
  type: "index";
  index: number;
}>;

/**
 * 상대 이동과 direct drag index를 하나의 atomic reorder 명령으로 전달한다.
 */
export type TaskbarReorderIntent = TaskbarReorderAction | TaskbarReorderDestination;

/**
 * concrete application identity를 immutable Taskbar Group identity로 만든다.
 *
 * TypeScript를 우회한 지원하지 않는 application 값에는 TypeError를 던진다.
 */
export const createTaskbarApplicationItem = (
  applicationId: TaskbarApplicationId,
): TaskbarApplicationItem => {
  if (applicationId !== "file-explorer" && applicationId !== "chrome") {
    throw new TypeError("Taskbar application identity가 유효하지 않습니다");
  }
  return Object.freeze({ kind: "application", applicationId });
};

/**
 * ExternalShortcut ResourceRef를 immutable Taskbar standalone identity로 만든다.
 *
 * TypeScript를 우회한 kind, UUID 또는 추가 field에는 TypeError를 던진다.
 */
export const createTaskbarExternalShortcutItem = (
  resource: ExternalShortcutResourceRef,
): TaskbarExternalShortcutItem => {
  const parsed = parseResourceRef(resource);
  if (parsed.kind !== "external-shortcut") {
    throw new TypeError("Taskbar ExternalShortcut에는 유효한 ResourceRef가 필요합니다");
  }
  return Object.freeze({ kind: "external-shortcut", resource: parsed });
};
