import { describe, expect, it } from "vitest";

import {
  type Content,
  createResourceRef,
  createStaticCatalog,
  type ExternalShortcut,
  type Folder,
  type ResourceRef,
} from "../../index.js";
import { normalizeResourceSearchQuery, searchResources } from "../index.js";

/**
 * 테스트마다 충돌하지 않는 고정 UUID로 Content 원본을 만든다.
 */
const content = (id: number, title: string, metadata: Partial<Content> = {}): Content => ({
  ref: createResourceRef("content", `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`),
  title,
  slug: "unrelated",
  summary: "본문검색제외",
  date: "2026-09-01",
  tags: [],
  cover: null,
  source: { kind: "notion", pageId: "provider" },
  ...metadata,
});

/**
 * 테스트마다 고정 UUID와 현재 이름을 가진 Folder 원본을 만든다.
 */
const folder = (id: number, name: string): Folder => ({
  ref: createResourceRef("folder", `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`),
  name,
});

/**
 * 테스트마다 검색 필드와 구분되는 URL을 가진 ExternalShortcut을 만든다.
 */
const shortcut = (id: number, name: string): ExternalShortcut => ({
  ref: createResourceRef(
    "external-shortcut",
    `00000000-0000-4000-8000-${String(id).padStart(12, "0")}`,
  ),
  name,
  url: "https://example.com/주소검색제외",
});

/**
 * 기존 Catalog builder로 typed reader와 입력 순서를 구성해 public 검색 결과를 관찰한다.
 */
const search = (
  query: string,
  contents: readonly Content[],
  folders: readonly Folder[] = [],
  shortcuts: readonly ExternalShortcut[] = [],
  candidates?: readonly ResourceRef[],
) =>
  searchResources({
    query,
    candidates: candidates ?? [...contents, ...folders, ...shortcuts].map(({ ref }) => ref),
    readers: {
      content: createStaticCatalog(contents),
      folder: createStaticCatalog(folders),
      externalShortcut: createStaticCatalog(shortcuts),
    },
  });

describe("normalizeResourceSearchQuery", () => {
  it("대소문자와 연속 공백을 정규화하고 NFC로 완성 음절을 합친다", () => {
    expect(normalizeResourceSearchQuery(" \tREACT\n  상태  ")).toBe("react 상태");
  });

  it("공백만 있는 원문을 빈 검색어로 바꾼다", () => {
    expect(normalizeResourceSearchQuery(" \n\t\u00a0")).toBe("");
  });
});

describe("searchResources", () => {
  it.each([
    ["react 상태", [1, 2, 3, 4, 5], ["exact", "prefix", "contains", "words", "metadata"]],
    ["REACT ㅅㅌ", [1, 2, 3, 4, 5], ["exact", "prefix", "contains", "words", "metadata"]],
    ["ReAcT 상ㅌ", [1, 2, 3, 4, 5], ["exact", "prefix", "contains", "words", "metadata"]],
    [" \t React\n상태  ", [1, 2, 3, 4, 5], ["exact", "prefix", "contains", "words", "metadata"]],
  ])("문구 %s는 전체 문구와 제목 AND와 metadata 순서를 보존한다", (query, ids, tiers) => {
    const entries = [
      content(5, "React", { tags: ["상태"], date: "2026-12-01" }),
      content(4, "상태 관리 React"),
      content(3, "새 React 상태 관리"),
      content(2, "React 상태 관리"),
      content(1, "React 상태"),
      content(6, "React only"),
      content(7, "상태 only"),
    ];
    const result = search(query, entries);
    expect(result.map(({ ref }) => Number(ref.id.slice(-12)))).toEqual(ids);
    expect(result.map(({ tier }) => tier)).toEqual(tiers);
  });

  it("초성 전체 문구에도 exact와 prefix와 contains와 단어 AND 단계를 적용한다", () => {
    const result = search("ㅅㅌ ㄱㄹ", [
      content(4, "관리하는 상태"),
      content(3, "새 상태 관리"),
      content(2, "상태 관리법"),
      content(1, "상태 관리"),
    ]);
    expect(result.map(({ tier }) => tier)).toEqual(["exact", "prefix", "contains", "words"]);
    expect(result.map(({ ref }) => Number(ref.id.slice(-12)))).toEqual([1, 2, 3, 4]);
  });

  it("Content 단어를 title과 각각의 tag와 slug에 걸쳐 AND로 충족한다", () => {
    const metadata = content(1, "React", { tags: ["상태", "성능"], slug: "resource-guide" });
    expect(search("React ㅅㅌ 성능 guide", [metadata])).toEqual([
      { ref: metadata.ref, tier: "metadata" },
    ]);
    expect(search("React 상태 없는단어", [metadata])).toEqual([]);
    expect(search("태성", [metadata])).toEqual([]);
  });

  it("tag와 slug만으로 충족한 일치는 동일 metadata tier이며 날짜로 정렬한다", () => {
    const newer = content(2, "다른 제목", { slug: "react", date: "2026-09-02" });
    const older = content(1, "다른 제목", { tags: ["React"], date: "2026-09-01" });
    expect(search("react", [older, newer])).toEqual([
      { ref: newer.ref, tier: "metadata" },
      { ref: older.ref, tier: "metadata" },
    ]);
  });

  it("단어 사이에 다른 단어가 있는 제목은 연속 문구 뒤와 metadata 앞에 둔다", () => {
    const contiguous = content(1, "React 상태 관리");
    const distributed = content(2, "React 고급 상태 관리");
    const metadata = content(3, "React", { tags: ["상태"], date: "2026-12-01" });
    expect(search("react 상태", [metadata, distributed, contiguous])).toEqual([
      { ref: contiguous.ref, tier: "prefix" },
      { ref: distributed.ref, tier: "words" },
      { ref: metadata.ref, tier: "metadata" },
    ]);
  });

  it("Folder와 shortcut은 현재 name만 사용하고 Content summary와 URL은 검색하지 않는다", () => {
    const f = folder(2, "React 상태 관리");
    const s = shortcut(3, "상태 React");
    expect(search("React ㅅㅌ", [], [f], [s])).toEqual([
      { ref: f.ref, tier: "prefix" },
      { ref: s.ref, tier: "words" },
    ]);
    expect(search("본문검색제외", [content(1, "다른 제목")], [f], [s])).toEqual([]);
    expect(search("주소검색제외", [], [f], [s])).toEqual([]);
  });

  it("더 높은 문구 일치가 종류 우선순위보다 먼저다", () => {
    const c = content(1, "React 상태 관리");
    const f = folder(2, "React 상태");
    const s = shortcut(3, "React 상태");
    expect(search("react 상태", [c], [f], [s]).map(({ ref }) => ref)).toEqual([
      f.ref,
      s.ref,
      c.ref,
    ]);
  });

  it("같은 단계에서 종류와 Content 최신 날짜와 이름과 최종 id 순서를 고정한다", () => {
    const older = content(1, "검색 내용", { date: "2026-09-01" });
    const newerHigh = content(3, "검색 내용", { date: "2026-09-02T00:00:00Z" });
    const newerLow = content(2, "검색 내용", { date: "2026-09-02T09:00:00+09:00" });
    const invalidHigh = content(5, "검색 내용", { date: "invalid" });
    const invalidLow = content(4, "검색 내용", { date: "" });
    const f1 = folder(6, "검색 가");
    const f2 = folder(7, "검색 나");
    const f3 = folder(8, "검색 나");
    const s1 = shortcut(9, "검색 가");
    const s2 = shortcut(10, "검색 나");
    const s3 = shortcut(11, "검색 나");
    const contents = [invalidHigh, newerHigh, older, invalidLow, newerLow];
    const folders = [f3, f2, f1];
    const shortcuts = [s3, s2, s1];
    const refs = [...contents, ...folders, ...shortcuts].map(({ ref }) => ref);
    const expected = [
      newerLow,
      newerHigh,
      older,
      invalidLow,
      invalidHigh,
      f1,
      f2,
      f3,
      s1,
      s2,
      s3,
    ].map(({ ref }) => ref);
    expect(search("검색", contents, folders, shortcuts, refs).map(({ ref }) => ref)).toEqual(
      expected,
    );
    expect(
      search("검색", contents, folders, shortcuts, [...refs].reverse()).map(({ ref }) => ref),
    ).toEqual(expected);
  });

  it("없는 후보와 중복 ref를 제외하고 제품이 허용한 후보만 반환한다", () => {
    const included = content(1, "검색");
    const excluded = content(2, "검색");
    const missing = folder(3, "검색");
    expect(
      search("검색", [included, excluded], [], [], [included.ref, missing.ref, included.ref]),
    ).toEqual([{ ref: included.ref, tier: "exact" }]);
  });

  it("빈 query에서는 초기화 전 reader도 조회하지 않는다", () => {
    const catalog = createStaticCatalog<Content>([]);
    const readers = {
      content: {
        has: catalog.has,
        list: catalog.list,
        get: () => {
          throw new Error("조회 불가");
        },
      },
      folder: createStaticCatalog<Folder>([]),
      externalShortcut: createStaticCatalog<ExternalShortcut>([]),
    };
    expect(searchResources({ query: "  ", candidates: [content(1, "검색").ref], readers })).toEqual(
      [],
    );
  });

  it("특수 문자와 emoji를 일반 문자로 비교하고 초성 뒤 모음은 확대 해석하지 않는다", () => {
    expect(
      search("[React] 🐱 상ㅌ", [content(1, "[React] 🐱 상태")]).map(({ tier }) => tier),
    ).toEqual(["exact"]);
    expect(search("ㅅㅏ", [content(1, "사")])).toEqual([]);
    expect(search("ㄲㄸㅃㅆㅉ", [content(1, "까따빠싸짜")]).map(({ tier }) => tier)).toEqual([
      "exact",
    ]);
    expect(search("ㄱ", [content(1, "ㄱ")]).map(({ tier }) => tier)).toEqual(["exact"]);
  });

  it("reader 오류를 숨기지 않고 소비 제품으로 전파한다", () => {
    const catalog = createStaticCatalog<Content>([]);
    const failure = new Error("reader 조회 실패");
    const readers = {
      content: {
        has: catalog.has,
        list: catalog.list,
        get: () => {
          throw failure;
        },
      },
      folder: createStaticCatalog<Folder>([]),
      externalShortcut: createStaticCatalog<ExternalShortcut>([]),
    };
    expect(() =>
      searchResources({ query: "검색", candidates: [content(1, "검색").ref], readers }),
    ).toThrow(failure);
  });

  it("다시 검색하면 Folder reader의 현재 이름을 읽는다", () => {
    const ref = folder(1, "이전").ref;
    let currentName = "이전";
    const readers = {
      content: createStaticCatalog<Content>([]),
      folder: {
        has: () => true,
        get: () => ({ ref, name: currentName }),
        list: () => [{ ref, name: currentName }],
      },
      externalShortcut: createStaticCatalog<ExternalShortcut>([]),
    };
    expect(searchResources({ query: "최신", candidates: [ref], readers })).toEqual([]);
    currentName = "최신";
    expect(searchResources({ query: "최신", candidates: [ref], readers })).toEqual([
      { ref, tier: "exact" },
    ]);
  });

  it("원문과 입력 ref 순서와 동결한 중첩 원본을 바꾸지 않는다", () => {
    const c = Object.freeze(
      content(1, "React 상태", {
        tags: Object.freeze(["guide"]),
        source: Object.freeze({ kind: "notion", pageId: "provider" }),
      }),
    );
    const f = Object.freeze(folder(2, "React 상태"));
    const candidates = Object.freeze([f.ref, c.ref]);
    const raw = "  REACT\t상태  ";
    const before = JSON.stringify({ c, f, candidates, raw });
    const result = search(raw, [c], [f], [], candidates);
    expect(JSON.stringify({ c, f, candidates, raw })).toBe(before);
    expect(result.map(({ ref }) => ref)).toEqual([c.ref, f.ref]);
    expect(result[0]?.ref).toBe(c.ref);
  });
});
