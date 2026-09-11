import type { ResourceReaders, ResourceRef } from "../../resources/index.js";
import type { StartPinnedItem, StartReorderAction } from "../model/index.js";

/**
 * Start pinned surface가 Catalog label과 위치별 이동 Action으로 소비할 항목이다.
 */
export type StartPinnedResourceView = Readonly<{
  resource: ResourceRef;
  label: string;
  reorderActions: readonly StartReorderAction[];
}>;

/**
 * 현재 위치에서 의미가 있는 Context Menu reorder Action만 만든다.
 */
const selectReorderActions = (index: number, length: number): readonly StartReorderAction[] =>
  Object.freeze([
    ...(index > 0 ? (["first", "left"] as const) : []),
    ...(index < length - 1 ? (["right"] as const) : []),
  ]);

/**
 * Pin identity를 현재 Catalog label과 결합하고 사라진 원본은 결과에서 제외한다.
 */
export const selectStartPinnedResources = (
  pinnedItems: readonly StartPinnedItem[],
  resources: ResourceReaders,
): readonly StartPinnedResourceView[] =>
  Object.freeze(
    pinnedItems.flatMap(({ resource }, index) => {
      const value =
        resource.kind === "content"
          ? resources.content.get(resource.id)
          : resource.kind === "folder"
            ? resources.folder.get(resource.id)
            : resources.externalShortcut.get(resource.id);
      if (value === undefined) return [];
      const label = "title" in value ? value.title : value.name;
      return [
        Object.freeze({
          resource,
          label,
          reorderActions: selectReorderActions(index, pinnedItems.length),
        }),
      ];
    }),
  );
