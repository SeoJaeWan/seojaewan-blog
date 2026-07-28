import { describe, expect, it } from "vitest";

import { resolveWindowItemActionVisuals } from ".";

describe("resolveWindowItemActionVisuals", () => {
  it("전달 순서와 관계없이 Window item action을 정해진 표시 순서로 제공한다", () => {
    const actions = resolveWindowItemActionVisuals([
      { id: "pinToTaskbar" },
      { id: "openLocation" },
      { id: "moveRight" },
      { id: "moveToFront" },
      { id: "moveLeft" },
    ]);

    expect(actions.map((action) => action.id)).toEqual([
      "moveToFront",
      "moveLeft",
      "moveRight",
      "openLocation",
      "pinToTaskbar",
    ]);
  });

  it("action의 비활성 상태와 UI 표시명을 결합한다", () => {
    const [action] = resolveWindowItemActionVisuals([{ disabled: true, id: "unpinFromStart" }]);

    expect(action).toMatchObject({
      disabled: true,
      id: "unpinFromStart",
      label: "시작 화면에서 제거",
    });
    expect(action?.icon).toBeDefined();
  });
});
