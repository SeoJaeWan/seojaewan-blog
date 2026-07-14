import type { WindowItem } from "@window/ui";

import { describe, expect, it } from "vitest";

import { createWindowsPanelSections } from "./index";

describe("createWindowsPanelSections", () => {
  it("빈 항목 목록은 빈 section 목록으로 변환한다", () => {
    expect(createWindowsPanelSections([])).toEqual([]);
  });

  it("원본 규칙으로 제목의 첫 글자를 category로 변환한다", () => {
    const items: WindowItem[] = [
      { id: "hangul", title: "미디어 리스트" },
      { id: "jamo", title: "ㄴ 항목" },
      { id: "lowercase", title: "react" },
      { id: "uppercase", title: "Window" },
      { id: "accent", title: "éclair" },
      { id: "number", title: "2026 회고" },
      { id: "symbol", title: "!중요" },
    ];

    const sections = createWindowsPanelSections(items);
    const categories = sections.map(({ category }) => category);
    const expectedCategories = ["ㅁ", "ㄴ", "R", "W", "É", "#", "!"].sort((a, b) =>
      a.localeCompare(b),
    );

    expect(categories).toEqual(expectedCategories);
  });

  it("같은 category의 항목 순서와 객체 참조를 보존한다", () => {
    const react: WindowItem = { id: "react", title: "react" };
    const redux: WindowItem = { id: "redux", title: "Redux" };
    const relay: WindowItem = { id: "relay", title: "relay" };
    const items = Object.freeze<WindowItem[]>([
      react,
      { id: "media", title: "미디어" },
      redux,
      relay,
    ]);

    const sections = createWindowsPanelSections(items);
    const englishSection = sections.find(({ category }) => category === "R");

    expect(englishSection?.items).toEqual([react, redux, relay]);
    expect(englishSection?.items[0]).toBe(react);
    expect(englishSection?.items[1]).toBe(redux);
    expect(englishSection?.items[2]).toBe(relay);
  });

  it("category만 localeCompare 순서로 정렬하고 항목 입력은 변경하지 않는다", () => {
    const items = Object.freeze<WindowItem[]>([
      Object.freeze({ id: "window", title: "Window" }),
      Object.freeze({ id: "bfs", title: "BFS" }),
      Object.freeze({ id: "all", title: "All" }),
    ]);
    const originalOrder = [...items];

    const sections = createWindowsPanelSections(items);

    expect(sections.map(({ category }) => category)).toEqual(
      ["W", "B", "A"].sort((a, b) => a.localeCompare(b)),
    );
    expect(items).toEqual(originalOrder);
  });

  it("빈 제목은 원본처럼 빈 category로 묶는다", () => {
    const item: WindowItem = { id: "empty", title: "   " };

    expect(createWindowsPanelSections([item])).toEqual([
      {
        category: "",
        items: [item],
      },
    ]);
  });
});
