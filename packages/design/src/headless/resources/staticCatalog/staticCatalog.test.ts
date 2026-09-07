import { describe, expect, expectTypeOf, it } from "vitest";

import {
  type Content,
  createResourceLookup,
  createResourceRef,
  createStaticCatalog,
  DuplicateResourceIdError,
  type ExternalShortcut,
  type Folder,
} from "../index.js";

const CONTENT_ID = "01927d65-2354-7a55-95c1-8c1a77a43b42";
const FOLDER_ID = "57dd8487-031a-4f60-bc14-4f77f92be32f";
const SHORTCUT_ID = "55756a63-362b-4df0-891f-60ca71f78506";
const MISSING_ID = "a455af0f-e26a-4990-8a25-9f5a9ec922f5";

const content: Content = {
  ref: createResourceRef("content", CONTENT_ID),
  title: "Catalog contracts",
  slug: "catalog-contracts",
  summary: "A headless catalog contract",
  date: "2026-09-05",
  tags: ["architecture"],
  cover: null,
  source: { kind: "notion", pageId: "notion-provider-page-key" },
};

const folder: Folder = {
  ref: createResourceRef("folder", FOLDER_ID),
  name: "Blog",
};

const shortcut: ExternalShortcut = {
  ref: createResourceRef("external-shortcut", SHORTCUT_ID),
  name: "GitHub",
  url: "https://github.com/",
};

describe("createStaticCatalog", () => {
  it("입력 순서대로 읽기 전용 Catalog snapshot을 만든다", () => {
    const catalog = createStaticCatalog([content]);
    expect(catalog.list()).toEqual([content]);
    expectTypeOf(catalog.get(content.ref.id)).toEqualTypeOf<Content | undefined>();
    expectTypeOf(createStaticCatalog([folder]).get(folder.ref.id)).toEqualTypeOf<
      Folder | undefined
    >();
    expectTypeOf(createStaticCatalog([shortcut]).get(shortcut.ref.id)).toEqualTypeOf<
      ExternalShortcut | undefined
    >();
  });

  it("한 Catalog 안의 중복 UUID를 거부한다", () => {
    expect(() => createStaticCatalog([content, { ...content }])).toThrow(DuplicateResourceIdError);
  });

  it("입력 배열과 top-level 값의 사후 변경으로부터 snapshot을 분리한다", () => {
    const input = { ...content, tags: [...content.tags] };
    const entries = [input];
    const catalog = createStaticCatalog(entries);
    entries.splice(0);
    input.title = "변경된 원본";
    expect(catalog.get(content.ref.id)).toEqual(content);
    expect(Object.isFrozen(catalog.list())).toBe(true);
    expect(Object.isFrozen(catalog.list()[0]?.ref)).toBe(true);
  });
});

describe.each([content, folder, shortcut])("Catalog $ref.kind 읽기", (resource) => {
  describe("has", () => {
    it("등록된 ID이면 true를 반환한다", () => {
      expect(createStaticCatalog([resource]).has(resource.ref.id)).toBe(true);
    });
    it("등록되지 않은 ID이면 false를 반환한다", () => {
      expect(createStaticCatalog([resource]).has(createResourceRef("content", MISSING_ID).id)).toBe(
        false,
      );
    });
  });
  describe("get", () => {
    it("ID가 일치하는 원본 snapshot을 반환한다", () => {
      expect(createStaticCatalog([resource]).get(resource.ref.id)).toEqual(resource);
    });
    it("등록되지 않은 ID이면 undefined를 반환한다", () => {
      expect(
        createStaticCatalog([resource]).get(createResourceRef("content", MISSING_ID).id),
      ).toBeUndefined();
    });
  });
  describe("list", () => {
    it("같은 읽기 전용 목록을 반환하며 조회가 원본을 변경하지 않는다", () => {
      const catalog = createStaticCatalog([resource]);
      const before = catalog.list();
      catalog.has(resource.ref.id);
      catalog.get(resource.ref.id);
      expect(catalog.list()).toBe(before);
      expect(before).toEqual([resource]);
      expect(() => (before as unknown[]).push(resource)).toThrow();
    });
  });
});

describe("createResourceLookup", () => {
  it("kind가 달라도 전역 namespace에서 중복 UUID를 거부한다", () => {
    const duplicateFolder: Folder = {
      ref: createResourceRef("folder", CONTENT_ID),
      name: "Duplicate",
    };
    expect(() =>
      createResourceLookup({
        content: createStaticCatalog([content]),
        folder: createStaticCatalog([duplicateFolder]),
        externalShortcut: createStaticCatalog([shortcut]),
      }),
    ).toThrow(DuplicateResourceIdError);
  });
});
