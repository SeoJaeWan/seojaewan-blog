import { describe, expect, it } from "vitest";

import { createResourceRef, createStaticCatalog } from "../../resources/index.js";
import { selectStartPinnedResources } from "./index.js";

describe("selectStartPinnedResources", () => {
  it("현재 Catalog label과 위치별 reorder Action을 결합한다", () => {
    const content = {
      ref: createResourceRef("content", "00000000-0000-4000-8000-000000000001"),
      title: "문서",
      slug: "document",
      summary: "요약",
      date: "2026-09-11",
      tags: [],
      cover: null,
      source: { kind: "notion", pageId: "page-1" },
    } as const;
    const folder = {
      ref: createResourceRef("folder", "00000000-0000-4000-8000-000000000002"),
      name: "폴더",
    } as const;
    const resources = {
      content: createStaticCatalog([content]),
      folder: createStaticCatalog([folder]),
      externalShortcut: createStaticCatalog([]),
    };

    expect(
      selectStartPinnedResources([{ resource: content.ref }, { resource: folder.ref }], resources),
    ).toEqual([
      { resource: content.ref, label: "문서", reorderActions: ["right"] },
      { resource: folder.ref, label: "폴더", reorderActions: ["first", "left"] },
    ]);
  });

  it("현재 Catalog에 없는 Pin은 숨긴다", () => {
    const resources = {
      content: createStaticCatalog([]),
      folder: createStaticCatalog([]),
      externalShortcut: createStaticCatalog([]),
    };

    expect(
      selectStartPinnedResources(
        [
          {
            resource: createResourceRef("folder", "00000000-0000-4000-8000-000000000003"),
          },
        ],
        resources,
      ),
    ).toEqual([]);
  });
});
