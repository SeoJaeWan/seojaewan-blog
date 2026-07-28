import { describe, expect, it } from "vitest";

import { createPinnedWindowItemContextActions, createWindowItemContextActions } from ".";

const getActionIds = (
  actions: ReturnType<
    typeof createPinnedWindowItemContextActions | typeof createWindowItemContextActions
  >,
) => actions.map((action) => action.id);

const baseOptions = {
  itemId: "notes",
  taskbarPinnedIds: [] as readonly string[],
  windowsPinnedIds: ["calculator", "terminal", "notes", "settings"] as readonly string[],
};

describe("createPinnedWindowItemContextActions", () => {
  it("세 번째 이후 항목에는 맨 앞·왼쪽·오른쪽 이동을 모두 제공한다", () => {
    expect(getActionIds(createPinnedWindowItemContextActions(baseOptions))).toEqual([
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
      getActionIds(
        createPinnedWindowItemContextActions({
          ...baseOptions,
          itemId: "calculator",
        }),
      ),
    ).toEqual(["moveRight", "openLocation", "unpinFromStart", "pinToTaskbar"]);
  });

  it("두 번째 항목에는 중복되는 맨 앞 이동 없이 왼쪽과 오른쪽 이동을 제공한다", () => {
    expect(
      getActionIds(
        createPinnedWindowItemContextActions({
          ...baseOptions,
          itemId: "terminal",
        }),
      ),
    ).toEqual(["moveLeft", "moveRight", "openLocation", "unpinFromStart", "pinToTaskbar"]);
  });

  it("마지막 항목에는 맨 앞과 왼쪽 이동만 제공한다", () => {
    expect(
      getActionIds(
        createPinnedWindowItemContextActions({
          ...baseOptions,
          itemId: "settings",
        }),
      ),
    ).toEqual(["moveToFront", "moveLeft", "openLocation", "unpinFromStart", "pinToTaskbar"]);
  });
});

describe("createWindowItemContextActions", () => {
  it("reorder 없이 현재 pin 상태에 맞는 공통 action을 제공한다", () => {
    expect(
      getActionIds(
        createWindowItemContextActions({
          ...baseOptions,
          taskbarPinnedIds: ["notes"],
        }),
      ),
    ).toEqual(["openLocation", "unpinFromStart", "unpinFromTaskbar"]);
  });

  it("고정되지 않은 항목에는 두 surface의 고정 action을 제공한다", () => {
    expect(
      getActionIds(
        createWindowItemContextActions({
          ...baseOptions,
          itemId: "paint",
        }),
      ),
    ).toEqual(["openLocation", "pinToStart", "pinToTaskbar"]);
  });
});
