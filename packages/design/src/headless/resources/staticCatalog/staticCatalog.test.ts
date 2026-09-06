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

describe("static Catalog common implementation", () => {
  it("Content Catalog가 typed static has/get/list와 miss 결과를 제공한다", () => {
    const ContentCatalog = createStaticCatalog([content]);

    expect(ContentCatalog.has(content.ref.id)).toBe(true);
    expect(ContentCatalog.has(createResourceRef("content", MISSING_ID).id)).toBe(false);
    expect(ContentCatalog.get(content.ref.id)).toEqual(content);
    expect(ContentCatalog.get(createResourceRef("content", MISSING_ID).id)).toBeUndefined();
    expect(ContentCatalog.list()).toEqual([content]);
    expectTypeOf(ContentCatalog.get(content.ref.id)).toEqualTypeOf<Content | undefined>();
  });

  it("Folder Catalog가 typed static has/get/list와 miss 결과를 제공한다", () => {
    const FolderCatalog = createStaticCatalog([folder]);

    expect(FolderCatalog.has(folder.ref.id)).toBe(true);
    expect(FolderCatalog.get(folder.ref.id)).toEqual(folder);
    expect(FolderCatalog.list()).toEqual([folder]);
    expectTypeOf(FolderCatalog.get(folder.ref.id)).toEqualTypeOf<Folder | undefined>();
  });

  it("ExternalShortcut Catalog가 typed static has/get/list와 miss 결과를 제공한다", () => {
    const ExternalShortcutCatalog = createStaticCatalog([shortcut]);

    expect(ExternalShortcutCatalog.has(shortcut.ref.id)).toBe(true);
    expect(ExternalShortcutCatalog.get(shortcut.ref.id)).toEqual(shortcut);
    expect(ExternalShortcutCatalog.list()).toEqual([shortcut]);
    expectTypeOf(ExternalShortcutCatalog.get(shortcut.ref.id)).toEqualTypeOf<
      ExternalShortcut | undefined
    >();
  });

  it("입력 배열과 identity 변경에서 Catalog snapshot을 분리한다", () => {
    const mutableResources = [content];
    const ContentCatalog = createStaticCatalog(mutableResources);

    mutableResources.splice(0);

    expect(ContentCatalog.list()).toHaveLength(1);
    expect(Object.isFrozen(ContentCatalog.list())).toBe(true);
    expect(Object.isFrozen(ContentCatalog.list()[0])).toBe(true);
    expect(Object.isFrozen(ContentCatalog.list()[0]?.ref)).toBe(true);
  });

  it("한 Catalog 안에서 중복 UUID를 거부한다", () => {
    expect(() => createStaticCatalog([content, { ...content }])).toThrow(DuplicateResourceIdError);
    expect(() => createStaticCatalog([content, { ...content }])).toThrow(
      `전역 Resource namespace에서 이미 사용 중인 ResourceId입니다: ${CONTENT_ID}`,
    );
  });

  it("kind가 달라도 전체 Resource namespace에서 중복 UUID를 거부한다", () => {
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
