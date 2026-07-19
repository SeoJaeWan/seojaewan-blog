import { describe, expect, it } from "vitest";

import { createHangulInitials, getHangulInitialConsonant, isHangulInitialsQuery } from "./index";

describe("hangul", () => {
  describe("getHangulInitialConsonant", () => {
    it.each([
      ["가", "ㄱ"],
      ["까", "ㄲ"],
      ["나", "ㄴ"],
      ["힣", "ㅎ"],
      ["ㄱ", "ㄱ"],
      ["ㅎ", "ㅎ"],
    ])("%s의 초성을 반환한다", (character, expected) => {
      expect(getHangulInitialConsonant(character)).toBe(expected);
    });

    it.each(["", "A", "1", "😀"])("초성이 없는 %s에는 null을 반환한다", (character) => {
      expect(getHangulInitialConsonant(character)).toBeNull();
    });
  });

  it("한글 음절만 초성으로 바꾸고 나머지 문자는 보존한다", () => {
    expect(createHangulInitials("React 계산기 1!")).toBe("React ㄱㅅㄱ 1!");
  });

  describe("isHangulInitialsQuery", () => {
    it.each(["ㄱ", "ㄱ ㅅ ㄲ"])("초성으로만 구성된 %s를 허용한다", (query) => {
      expect(isHangulInitialsQuery(query)).toBe(true);
    });

    it.each(["", "   ", "ㄱㅏ", "계", "ㄱa"])("초성 검색어가 아닌 %s를 거부한다", (query) => {
      expect(isHangulInitialsQuery(query)).toBe(false);
    });
  });
});
