import { describe, expect, it, vi } from "vitest";

import {
  readTaskbarPinnedIds,
  readWindowsPinnedIds,
  WINDOW_PIN_STORAGE_KEYS,
  writeTaskbarPinnedIds,
  writeWindowsPinnedIds,
} from "./index";

const createStorage = (values: Record<string, string> = {}) => {
  const entries = new Map(Object.entries(values));

  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value);
    }),
  };
};

describe("windowPinStorage", () => {
  it("각 surface의 versioned key에서 pin ID를 읽는다", () => {
    const storage = createStorage({
      [WINDOW_PIN_STORAGE_KEYS.taskbar]: JSON.stringify(["terminal"]),
      [WINDOW_PIN_STORAGE_KEYS.windows]: JSON.stringify(["calculator"]),
    });

    expect(readWindowsPinnedIds(storage)).toEqual(["calculator"]);
    expect(readTaskbarPinnedIds(storage)).toEqual(["terminal"]);
  });

  it.each([
    { label: "누락된 값", value: null },
    { label: "잘못된 JSON", value: "[" },
    { label: "배열이 아닌 값", value: JSON.stringify({ id: "calculator" }) },
    { label: "문자열 외 항목이 섞인 배열", value: JSON.stringify(["calculator", 1]) },
  ])("$label은 빈 배열로 복구한다", ({ value }) => {
    const storage = createStorage(
      value === null ? {} : { [WINDOW_PIN_STORAGE_KEYS.windows]: value },
    );

    expect(readWindowsPinnedIds(storage)).toEqual([]);
  });

  it("중복 ID는 최초 순서를 유지하며 한 번만 복원한다", () => {
    const storage = createStorage({
      [WINDOW_PIN_STORAGE_KEYS.windows]: JSON.stringify(["calculator", "terminal", "calculator"]),
    });

    expect(readWindowsPinnedIds(storage)).toEqual(["calculator", "terminal"]);
  });

  it("최종 pin ID를 surface별 key에 JSON으로 저장한다", () => {
    const storage = createStorage();

    expect(writeTaskbarPinnedIds(["terminal"], storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      WINDOW_PIN_STORAGE_KEYS.taskbar,
      JSON.stringify(["terminal"]),
    );
  });

  it("storage read/write 오류를 빈 값과 실패 결과로 격리한다", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("read failed");
      }),
      setItem: vi.fn(() => {
        throw new Error("write failed");
      }),
    };

    expect(readWindowsPinnedIds(storage)).toEqual([]);
    expect(writeWindowsPinnedIds(["calculator"], storage)).toBe(false);
  });
});
