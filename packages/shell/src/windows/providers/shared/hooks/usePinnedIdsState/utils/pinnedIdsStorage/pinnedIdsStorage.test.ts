import { describe, expect, it, vi } from "vitest";

import { readPinnedIds, writePinnedIds } from "./index";

const TASKBAR_PIN_STORAGE_KEY = "taskbarPinnedIds_v1";
const WINDOWS_PIN_STORAGE_KEY = "windowsPinnedIds_v1";

const createStorage = (values: Record<string, string> = {}) => {
  const entries = new Map(Object.entries(values));

  return {
    getItem: vi.fn((key: string) => entries.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => {
      entries.set(key, value);
    }),
  };
};

describe("pinnedIdsStorage", () => {
  it("전달된 versioned key에서 pin ID를 읽는다", () => {
    const storage = createStorage({
      [TASKBAR_PIN_STORAGE_KEY]: JSON.stringify(["terminal"]),
      [WINDOWS_PIN_STORAGE_KEY]: JSON.stringify(["calculator"]),
    });

    expect(readPinnedIds(WINDOWS_PIN_STORAGE_KEY, storage)).toEqual({
      needsWriteBack: false,
      pinnedIds: ["calculator"],
    });
    expect(readPinnedIds(TASKBAR_PIN_STORAGE_KEY, storage)).toEqual({
      needsWriteBack: false,
      pinnedIds: ["terminal"],
    });
  });

  it("누락된 값은 빈 배열로 읽되 write-back 대상으로 표시하지 않는다", () => {
    expect(readPinnedIds(WINDOWS_PIN_STORAGE_KEY, createStorage())).toEqual({
      needsWriteBack: false,
      pinnedIds: [],
    });
  });

  it.each([
    { label: "잘못된 JSON", value: "[" },
    { label: "pin ID 배열 대신 저장된 객체 값", value: JSON.stringify({ id: "calculator" }) },
    { label: "문자열 외 항목이 섞인 배열", value: JSON.stringify(["calculator", 1]) },
  ])("$label은 빈 배열과 write-back 대상으로 읽는다", ({ value }) => {
    const storage = createStorage({ [WINDOWS_PIN_STORAGE_KEY]: value });

    expect(readPinnedIds(WINDOWS_PIN_STORAGE_KEY, storage)).toEqual({
      needsWriteBack: true,
      pinnedIds: [],
    });
  });

  it("중복 ID는 최초 순서를 유지하며 write-back 대상으로 읽는다", () => {
    const storage = createStorage({
      [WINDOWS_PIN_STORAGE_KEY]: JSON.stringify(["calculator", "terminal", "calculator"]),
    });

    expect(readPinnedIds(WINDOWS_PIN_STORAGE_KEY, storage)).toEqual({
      needsWriteBack: true,
      pinnedIds: ["calculator", "terminal"],
    });
  });

  it("최종 pin ID를 전달된 key에 JSON으로 저장한다", () => {
    const storage = createStorage();

    expect(writePinnedIds(TASKBAR_PIN_STORAGE_KEY, ["terminal"], storage)).toBe(true);
    expect(storage.setItem).toHaveBeenCalledWith(
      TASKBAR_PIN_STORAGE_KEY,
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

    expect(readPinnedIds(WINDOWS_PIN_STORAGE_KEY, storage)).toEqual({
      needsWriteBack: false,
      pinnedIds: [],
    });
    expect(writePinnedIds(WINDOWS_PIN_STORAGE_KEY, ["calculator"], storage)).toBe(false);
  });
});
