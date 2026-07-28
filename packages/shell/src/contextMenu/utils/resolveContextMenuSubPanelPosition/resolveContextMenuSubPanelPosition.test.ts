import { describe, expect, it } from "vitest";

import { resolveContextMenuSubPanelPosition } from ".";

const baseOptions = {
  panelHeight: 180,
  panelWidth: 200,
  triggerLeft: 100,
  triggerRight: 300,
  triggerTop: 100,
  viewportHeight: 600,
  viewportWidth: 800,
};

describe("resolveContextMenuSubPanelPosition", () => {
  it("오른쪽 공간이 충분하면 trigger 오른쪽과 top에 submenu를 배치한다", () => {
    expect(resolveContextMenuSubPanelPosition(baseOptions)).toEqual({
      right: 0,
      top: 0,
      transform: "translateX(100%)",
    });
  });

  it("오른쪽 공간이 부족하면 trigger 왼쪽으로 submenu를 뒤집는다", () => {
    expect(
      resolveContextMenuSubPanelPosition({
        ...baseOptions,
        triggerLeft: 590,
        triggerRight: 790,
      }),
    ).toEqual({
      left: 0,
      top: 0,
      transform: "translateX(-100%)",
    });
  });

  it("하단 공간이 부족하면 submenu top을 위로 이동해 viewport 여백을 유지한다", () => {
    expect(
      resolveContextMenuSubPanelPosition({
        ...baseOptions,
        panelHeight: 200,
        triggerTop: 550,
      }),
    ).toEqual({
      right: 0,
      top: -158,
      transform: "translateX(100%)",
    });
  });
});
