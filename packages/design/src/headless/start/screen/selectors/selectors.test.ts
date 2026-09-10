/** @file Start 모두 보기 대상, group 분류, 정렬과 immutable 결과를 검증한다. */
import { describe, expect, it, vi } from "vitest";

import {
  type Content,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcut,
  type ResourceReaders,
} from "../../../resources/index.js";
import {
  getStartScreenGroupKey,
  selectStartScreenAllGroups,
  START_SCREEN_GROUP_ORDER,
} from "./index.js";

/** 최소 metadata를 가진 Content fixture를 만든다. */
const content = (id: number, title: string): Content => ({
  ref: createResourceRef("content", `10000000-0000-4000-8000-${String(id).padStart(12, "0")}`),
  title,
  slug: `content-${id}`,
  summary: "",
  date: "2026-09-10",
  tags: [],
  cover: null,
  source: { kind: "notion", pageId: `page-${id}` },
});

/** 최소 metadata를 가진 ExternalShortcut fixture를 만든다. */
const shortcut = (id: number, name: string): ExternalShortcut => ({
  ref: createResourceRef(
    "external-shortcut",
    `20000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  ),
  name,
  url: `https://example.com/${id}`,
});

/** Folder reader 접근을 실패시켜 selector가 Folder를 읽지 않는지 검증하는 reader 집합을 만든다. */
const readers = (): ResourceReaders => ({
  content: createStaticCatalog([
    content(1, "Alpha"),
    content(2, "Able"),
    content(3, "가나다"),
    content(4, "7zip"),
  ]),
  externalShortcut: createStaticCatalog([
    shortcut(1, "Alpine"),
    shortcut(2, "_Tool"),
    shortcut(3, "2Do"),
  ]),
  folder: {
    has: vi.fn(() => false),
    get: vi.fn(() => undefined),
    list: vi.fn(() => {
      throw new Error("모두 보기 selector가 Folder reader를 호출했습니다");
    }),
  },
});

describe("getStartScreenGroupKey", () => {
  it("Alpha, 가나다, 7zip과 _Tool을 각각 A, ㄱ, 7과 #으로 분류한다", () => {
    expect(getStartScreenGroupKey("Alpha")).toBe("A");
    expect(getStartScreenGroupKey("가나다")).toBe("ㄱ");
    expect(getStartScreenGroupKey("7zip")).toBe("7");
    expect(getStartScreenGroupKey("_Tool")).toBe("#");
  });

  it("lowercase와 한글 호환 자모를 canonical key로 정규화한다", () => {
    expect(getStartScreenGroupKey("beta")).toBe("B");
    expect(getStartScreenGroupKey("ㅎ글")).toBe("ㅎ");
    expect(getStartScreenGroupKey("")).toBe("#");
  });
});

describe("selectStartScreenAllGroups", () => {
  it("Content와 ExternalShortcut만 A-Z, 초성, 개별 숫자, # 순서로 묶는다", () => {
    const groups = selectStartScreenAllGroups(readers());

    expect(groups.map(({ key }) => key)).toEqual(["A", "ㄱ", "2", "7", "#"]);
    expect(groups.flatMap(({ items }) => items.map(({ resource }) => resource.kind))).toContain(
      "content",
    );
    expect(groups.flatMap(({ items }) => items.map(({ resource }) => resource.kind))).toContain(
      "external-shortcut",
    );
    expect(groups.flatMap(({ items }) => items.map(({ resource }) => resource.kind))).not.toContain(
      "folder",
    );
    expect(START_SCREEN_GROUP_ORDER.indexOf("2")).toBeLessThan(
      START_SCREEN_GROUP_ORDER.indexOf("7"),
    );
    expect(START_SCREEN_GROUP_ORDER.at(-1)).toBe("#");
  });

  it("group 안을 current title/name 오름차순으로 정렬하고 전체 결과를 동결한다", () => {
    const groups = selectStartScreenAllGroups(readers());
    const alpha = groups.find(({ key }) => key === "A");

    expect(alpha?.items.map(({ label }) => label)).toEqual(["Able", "Alpha", "Alpine"]);
    expect(Object.isFrozen(groups)).toBe(true);
    expect(Object.isFrozen(alpha)).toBe(true);
    expect(Object.isFrozen(alpha?.items)).toBe(true);
    expect(
      alpha?.items.every((entry) => Object.isFrozen(entry) && Object.isFrozen(entry.resource)),
    ).toBe(true);
  });
});
