import { describe, expect, it } from "vitest";

import type { StartPinnedItemViewModel } from "../../index.js";
import { createPinnedPreviewOffsets, findPinnedDestinationIndex, pinnedItemKey } from "./index.js";

const items = ["1", "2", "3"].map(
  (id) =>
    ({
      resource: { kind: "folder", id },
    }) as StartPinnedItemViewModel,
);
const rects = new Map(
  items.map((item, index) => [
    pinnedItemKey(item),
    { left: index * 50, top: 0, width: 40, height: 40 } as DOMRect,
  ]),
);

describe("start pinned drag geometry", () => {
  it("pointer에 가장 가까운 tile 중심을 destination으로 고른다", () => {
    expect(findPinnedDestinationIndex({ x: 74, y: 20 }, items, rects)).toBe(1);
  });

  it("첫 tile을 마지막으로 옮길 때 중간 tile을 앞 slot으로 이동시킨다", () => {
    expect([...createPinnedPreviewOffsets(0, 2, items, rects)]).toEqual([
      ["folder:2", { x: -50, y: 0 }],
      ["folder:3", { x: -50, y: 0 }],
    ]);
  });

  it("마지막 tile을 첫 위치로 옮기면 앞 tile을 다음 slot으로 이동시킨다", () => {
    expect([...createPinnedPreviewOffsets(2, 0, items, rects)]).toEqual([
      ["folder:1", { x: 50, y: 0 }],
      ["folder:2", { x: 50, y: 0 }],
    ]);
  });

  it("같은 위치와 누락된 rect는 offset을 만들지 않고 rect map을 변경하지 않는다", () => {
    const before = [...rects];
    expect(createPinnedPreviewOffsets(1, 1, items, rects).size).toBe(0);
    expect(createPinnedPreviewOffsets(0, 2, items, new Map()).size).toBe(0);
    expect([...rects]).toEqual(before);
  });
});
