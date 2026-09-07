import { describe, expect, it } from "vitest";

import {
  type Content,
  createResourceLookup,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcut,
  type Folder,
} from "../index.js";

const content: Content = {
  ref: createResourceRef("content", "01927d65-2354-7a55-95c1-8c1a77a43b42"),
  title: "Resource lookup",
  slug: "resource-lookup",
  summary: "Existence without original data",
  date: "2026-09-05",
  tags: [],
  cover: null,
  source: { kind: "notion", pageId: "provider-key-not-resource-id" },
};

const folder: Folder = {
  ref: createResourceRef("folder", "57dd8487-031a-4f60-bc14-4f77f92be32f"),
  name: "Blog",
};

const shortcut: ExternalShortcut = {
  ref: createResourceRef("external-shortcut", "55756a63-362b-4df0-891f-60ca71f78506"),
  name: "GitHub",
  url: "https://github.com/",
};

const lookup = createResourceLookup({
  content: createStaticCatalog([content]),
  folder: createStaticCatalog([folder]),
  externalShortcut: createStaticCatalog([shortcut]),
});

describe("ResourceLookup.hasResource", () => {
  it.each([content.ref, folder.ref, shortcut.ref])(
    "$kind Resource의 존재를 true로 반환한다",
    (ref) => {
      expect(lookup.hasResource(ref)).toBe(true);
    },
  );

  it.each(["content", "folder", "external-shortcut"] as const)(
    "%s Resource가 없으면 false를 반환한다",
    (kind) => {
      const ref = createResourceRef(kind, "a455af0f-e26a-4990-8a25-9f5a9ec922f5");

      expect(lookup.hasResource(ref)).toBe(false);
    },
  );

  it("같은 ID라도 요청 kind가 다르면 존재하지 않는 것으로 반환한다", () => {
    expect(lookup.hasResource(createResourceRef("folder", content.ref.id))).toBe(false);
  });

  it("조회 전후 ref와 Catalog 원본을 변경하지 않는다", () => {
    const original = structuredClone(content);
    const ref = { ...content.ref };
    lookup.hasResource(ref);
    expect(ref).toEqual(content.ref);
    expect(content).toEqual(original);
  });
});
