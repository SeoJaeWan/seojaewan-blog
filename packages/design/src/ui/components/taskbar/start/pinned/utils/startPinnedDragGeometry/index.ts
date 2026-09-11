import type { StartPinnedItemViewModel } from "../../index.js";

/**
 * Drag preview에서 한 tile에 적용할 px 이동량이다.
 */
export type DragItemOffset = Readonly<{ x: number; y: number }>;

/**
 * Pinned item의 ResourceRef를 DOM map에서 충돌하지 않는 key로 바꾼다.
 */
export const pinnedItemKey = (item: StartPinnedItemViewModel): string =>
  `${item.resource.kind}:${item.resource.id}`;

/**
 * 현재 pinned item DOM rect를 표시 순서와 같은 key map으로 측정한다.
 */
export const measurePinnedItemRects = (
  items: readonly StartPinnedItemViewModel[],
  elements: ReadonlyMap<string, HTMLButtonElement>,
): ReadonlyMap<string, DOMRect> =>
  new Map(
    items.flatMap((item) => {
      const element = elements.get(pinnedItemKey(item));
      return element === undefined
        ? []
        : ([[pinnedItemKey(item), element.getBoundingClientRect()]] as const);
    }),
  );

/**
 * Pointer와 가장 가까운 tile 중심의 표시 index를 찾는다.
 */
export const findPinnedDestinationIndex = (
  pointer: Readonly<{ x: number; y: number }>,
  items: readonly StartPinnedItemViewModel[],
  rects: ReadonlyMap<string, DOMRect>,
): number => {
  let destination = 0;
  let distance = Number.POSITIVE_INFINITY;
  items.forEach((item, index) => {
    const rect = rects.get(pinnedItemKey(item));
    if (rect === undefined) return;
    const nextDistance = Math.hypot(
      pointer.x - (rect.left + rect.width / 2),
      pointer.y - (rect.top + rect.height / 2),
    );
    if (nextDistance < distance) {
      destination = index;
      distance = nextDistance;
    }
  });
  return destination;
};

/**
 * Source와 예상 destination 사이의 tile을 최종 slot 방향으로 한 칸씩 이동시킨다.
 */
export const createPinnedPreviewOffsets = (
  source: number,
  destination: number,
  items: readonly StartPinnedItemViewModel[],
  rects: ReadonlyMap<string, DOMRect>,
): ReadonlyMap<string, DragItemOffset> => {
  const offsets = new Map<string, DragItemOffset>();
  if (source === destination) return offsets;
  const first = source < destination ? source + 1 : destination;
  const last = source < destination ? destination : source - 1;
  const slotStep = source < destination ? -1 : 1;
  for (let index = first; index <= last; index += 1) {
    const item = items[index];
    const slot = items[index + slotStep];
    if (item === undefined || slot === undefined) continue;
    const itemRect = rects.get(pinnedItemKey(item));
    const slotRect = rects.get(pinnedItemKey(slot));
    if (itemRect === undefined || slotRect === undefined) continue;
    offsets.set(
      pinnedItemKey(item),
      Object.freeze({ x: slotRect.left - itemRect.left, y: slotRect.top - itemRect.top }),
    );
  }
  return offsets;
};
