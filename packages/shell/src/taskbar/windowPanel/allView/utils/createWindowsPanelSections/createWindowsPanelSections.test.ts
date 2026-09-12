import type { WindowItem } from "@window/ui";

import { describe, expect, it, vi } from "vitest";

import { createWindowsPanelSections } from "./index";

describe("createWindowsPanelSections", () => {
  it("빈 항목 목록은 빈 section 목록으로 변환한다", () => {
    expect(createWindowsPanelSections([])).toEqual([]);
  });

  it("현재 canonical 영문·초성·숫자·기호 group 순서를 따른다", () => {
    const items: WindowItem[] = [
      { id: "symbol", title: "!중요" },
      { id: "number", title: "2026 회고" },
      { id: "hangul", title: "미디어 리스트" },
      { id: "jamo", title: "ㄴ 항목" },
      { id: "lowercase", title: "react" },
      { id: "uppercase", title: "Window" },
      { id: "accent", title: "éclair" },
      { id: "empty", title: "   " },
      { id: "zero", title: "0 시작" },
    ];
    const sections = createWindowsPanelSections(items);
    expect(sections.map(({ category }) => category)).toEqual(["R", "W", "ㄴ", "ㅁ", "0", "2", "#"]);
    expect(sections.find(({ category }) => category === "#")?.items).toHaveLength(3);
  });

  it("같은 group은 현재 title 오름차순·동률 ID 순이고 입력과 객체를 보존한다", () => {
    const react: WindowItem = Object.freeze({ id: "b", title: "react" });
    const duplicate: WindowItem = Object.freeze({ id: "a", title: "react" });
    const redux: WindowItem = Object.freeze({ id: "redux", title: "Redux" });
    const relay: WindowItem = Object.freeze({ id: "relay", title: "relay" });
    const items = Object.freeze([relay, redux, react, duplicate]);
    const sections = createWindowsPanelSections(items);
    expect(sections[0]?.items).toEqual([duplicate, react, redux, relay]);
    expect(sections[0]?.items[0]).toBe(duplicate);
    expect(sections[0]?.items[1]).toBe(react);
    expect(items).toEqual([relay, redux, react, duplicate]);
  });

  it.each(["en-US", "ko-KR"])("host %s 비교가 달라도 group과 title 결과는 같다", (hostLocale) => {
    // 암묵적 String localeCompare에 host별 결과를 제공한다. production은 명시적 Collator를 쓴다.
    const hostCompare = vi.spyOn(String.prototype, "localeCompare").mockImplementation(function (
      this: string,
      other: string,
      locales?: Intl.LocalesArgument,
      options?: Intl.CollatorOptions,
    ) {
      return new Intl.Collator(locales ?? hostLocale, options).compare(this, other);
    });
    try {
      const sections = createWindowsPanelSections([
        { id: "media", title: "미디어" },
        { id: "relay", title: "relay" },
        { id: "number", title: "2 회고" },
        { id: "react", title: "react" },
        { id: "symbol", title: "! 중요" },
      ]);
      expect(sections.map(({ category }) => category)).toEqual(["R", "ㅁ", "2", "#"]);
      expect(sections[0]?.items.map(({ id }) => id)).toEqual(["react", "relay"]);
      expect(hostCompare).not.toHaveBeenCalled();
    } finally {
      hostCompare.mockRestore();
    }
  });
});
