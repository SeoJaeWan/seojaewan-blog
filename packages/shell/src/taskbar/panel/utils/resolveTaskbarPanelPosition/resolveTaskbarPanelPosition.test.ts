import { describe, expect, it } from "vitest";

import { resolveTaskbarPanelPosition } from "./index";

const resolvePosition = (
  overrides: Partial<Parameters<typeof resolveTaskbarPanelPosition>[0]> = {},
) =>
  resolveTaskbarPanelPosition({
    gap: 8,
    panelRect: { width: 400 },
    placement: "left",
    triggerRect: { left: 300, top: 700, width: 40 },
    viewportHeight: 800,
    viewportPadding: 8,
    viewportWidth: 1200,
    ...overrides,
  });

describe("resolveTaskbarPanelPosition", () => {
  it.each([
    { expectedLeft: 300, label: "왼쪽", placement: "left" },
    { expectedLeft: 120, label: "버튼 중심", placement: "center" },
    { expectedLeft: 400, label: "화면 중심", placement: "rootCenter" },
  ] as const)("$label 배치는 기준에 맞는 left 좌표를 반환한다", ({ expectedLeft, placement }) => {
    expect(resolvePosition({ placement }).left).toBe(expectedLeft);
  });

  it("trigger와 panel 사이의 gap을 bottom 좌표에 반영한다", () => {
    expect(resolvePosition({ gap: 16 }).bottom).toBe(116);
  });

  it("panel이 viewport 오른쪽을 벗어나면 padding 안쪽으로 보정한다", () => {
    expect(
      resolvePosition({
        panelRect: { width: 200 },
        triggerRect: { left: 280, top: 700, width: 40 },
        viewportWidth: 300,
      }).left,
    ).toBe(92);
  });

  it("panel이 viewport 왼쪽을 벗어나면 padding 안쪽으로 보정한다", () => {
    expect(
      resolvePosition({
        placement: "center",
        triggerRect: { left: 0, top: 700, width: 20 },
      }).left,
    ).toBe(8);
  });

  it("panel이 viewport보다 넓으면 적용할 수 없는 padding을 제거한다", () => {
    expect(
      resolvePosition({
        panelRect: { width: 400 },
        triggerRect: { left: 100, top: 700, width: 40 },
        viewportWidth: 300,
      }).left,
    ).toBe(0);
  });
});
