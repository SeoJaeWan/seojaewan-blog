import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type Content,
  createResourceLookup,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcut,
  type Folder,
  type ResourceLookup,
} from "./index.js";

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

describe("ResourceLookup", () => {
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

  it("조회 계약과 반환값에 Resource 또는 ref를 노출하지 않는다", () => {
    expect(Object.keys(lookup)).toEqual(["hasResource"]);
    expectTypeOf<keyof ResourceLookup>().toEqualTypeOf<"hasResource">();
    expectTypeOf(lookup.hasResource(content.ref)).toEqualTypeOf<boolean>();
  });

  it("ExternalShortcut public 원본은 ref, name, url만 가진다", () => {
    expect(Object.keys(shortcut)).toEqual(["ref", "name", "url"]);
    expectTypeOf<keyof ExternalShortcut>().toEqualTypeOf<"ref" | "name" | "url">();
  });

  it("Notion pageId와 ResourceId를 별도 identity로 유지한다", () => {
    expect(content.source.pageId).not.toBe(content.ref.id);
  });
});
