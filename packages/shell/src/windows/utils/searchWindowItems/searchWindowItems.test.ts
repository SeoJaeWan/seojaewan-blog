import type { WindowItem } from "@window/ui";

import { describe, expect, it } from "vitest";

import { searchWindowItems } from "./index";

const MEDIA = Object.freeze({
  description: "사진과 VIDEO 도구",
  id: "media",
  title: "미디어 리스트",
}) satisfies WindowItem;
const MEDAL = Object.freeze({
  description: "수상 기록",
  id: "medal",
  title: "메달",
}) satisfies WindowItem;
const NOTES = Object.freeze({
  description: "빠른 메모",
  id: "notes",
  title: "Notes",
}) satisfies WindowItem;
const BAKERY = Object.freeze({ id: "bakery", title: "빵집" }) satisfies WindowItem;
const WINDOWS_ITEMS = Object.freeze([MEDIA, MEDAL, NOTES, BAKERY]);

describe("searchWindowItems", () => {
  it("빈 query와 공백 query는 원본 배열 참조를 반환한다", () => {
    expect(searchWindowItems(WINDOWS_ITEMS, "")).toBe(WINDOWS_ITEMS);
    expect(searchWindowItems(WINDOWS_ITEMS, " \n\t ")).toBe(WINDOWS_ITEMS);
  });

  it("title과 description을 대소문자 구분 없이 검색한다", () => {
    expect(searchWindowItems(WINDOWS_ITEMS, "nOtEs")).toEqual([NOTES]);
    expect(searchWindowItems(WINDOWS_ITEMS, "video")).toEqual([MEDIA]);
  });

  it("초성만 있는 query는 title과 description의 초성도 검색한다", () => {
    expect(searchWindowItems(WINDOWS_ITEMS, "ㅁㄷㅇ ㄹㅅㅌ")).toEqual([MEDIA]);
    expect(searchWindowItems(WINDOWS_ITEMS, "ㅃㄹ ㅁㅁ")).toEqual([NOTES]);
    expect(searchWindowItems(WINDOWS_ITEMS, "ㅃㅈ")).toEqual([BAKERY]);
  });

  it("일반 한글과 초성이 섞인 query는 초성 검색으로 확장하지 않는다", () => {
    expect(searchWindowItems(WINDOWS_ITEMS, "미디")).toEqual([MEDIA]);
    expect(searchWindowItems(WINDOWS_ITEMS, "ㅁㄷ 리스트")).toEqual([]);
  });

  it("별도 정렬이나 원본 변경 없이 입력 순서와 item 참조를 보존한다", () => {
    const originalOrder = [...WINDOWS_ITEMS];
    const results = searchWindowItems(WINDOWS_ITEMS, "ㅁ");

    expect(results).toEqual([MEDIA, MEDAL, NOTES]);
    expect(results[0]).toBe(MEDIA);
    expect(results[1]).toBe(MEDAL);
    expect(results[2]).toBe(NOTES);
    expect(WINDOWS_ITEMS).toEqual(originalOrder);
  });
});
