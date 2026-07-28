import { describe, expect, it } from "vitest";

import { createItemContextActions } from ".";

const getActionIds = (options: Parameters<typeof createItemContextActions>[0]) =>
  createItemContextActions(options).map((action) => action.id);

const baseOptions = {
  itemId: "notes",
  source: "pinned" as const,
  taskbarPinnedIds: [] as readonly string[],
  windowsPinnedIds: ["calculator", "terminal", "notes", "settings"] as readonly string[],
};

describe("createItemContextActions", () => {
  describe("pinned 순서 변경", () => {
    it("세 번째 이후 항목에는 맨 앞·왼쪽·오른쪽 이동을 제공한다", () => {
      expect(getActionIds(baseOptions)).toEqual([
        "moveToFront",
        "moveLeft",
        "moveRight",
        "openLocation",
        "unpinFromStart",
        "pinToTaskbar",
      ]);
    });

    it("첫 번째 항목에는 오른쪽 이동만 제공한다", () => {
      expect(
        getActionIds({
          ...baseOptions,
          itemId: "calculator",
        }),
      ).toEqual(["moveRight", "openLocation", "unpinFromStart", "pinToTaskbar"]);
    });

    it("두 번째 항목에는 중복되는 맨 앞 이동 없이 왼쪽과 오른쪽 이동을 제공한다", () => {
      expect(
        getActionIds({
          ...baseOptions,
          itemId: "terminal",
        }),
      ).toEqual(["moveLeft", "moveRight", "openLocation", "unpinFromStart", "pinToTaskbar"]);
    });

    it("마지막 항목에는 맨 앞과 왼쪽 이동만 제공한다", () => {
      expect(
        getActionIds({
          ...baseOptions,
          itemId: "settings",
        }),
      ).toEqual(["moveToFront", "moveLeft", "openLocation", "unpinFromStart", "pinToTaskbar"]);
    });
  });

  describe("공통 action", () => {
    it("all과 search에서는 순서 변경 없이 현재 pin 상태에 맞는 action을 제공한다", () => {
      const expected = ["openLocation", "unpinFromStart", "unpinFromTaskbar"];

      expect(
        getActionIds({
          ...baseOptions,
          source: "all",
          taskbarPinnedIds: ["notes"],
        }),
      ).toEqual(expected);
      expect(
        getActionIds({
          ...baseOptions,
          source: "search",
          taskbarPinnedIds: ["notes"],
        }),
      ).toEqual(expected);
    });

    it("고정되지 않은 항목에는 두 surface의 고정 action을 제공한다", () => {
      expect(
        getActionIds({
          ...baseOptions,
          itemId: "paint",
          source: "all",
        }),
      ).toEqual(["openLocation", "pinToStart", "pinToTaskbar"]);
    });
  });
});
