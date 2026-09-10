import { describe, expect, it } from "vitest";

import { calculateTaskbarPanelAnchorRect } from "./index.js";

describe("calculateTaskbarPanelAnchorRect", () => {
  it.each(["start", "search"] as const)(
    "%s의 가로 기준과 Taskbar 공통 상단을 계산한다",
    (variant) => {
      const triggerBounds = Object.freeze({ left: 450, top: 685, width: 220 });
      expect(
        calculateTaskbarPanelAnchorRect({
          variant,
          viewportWidth: 1280,
          triggerBounds,
          taskbarTop: 670,
        }),
      ).toEqual({
        x: variant === "start" ? 640 : 450,
        y: 670,
        width: variant === "start" ? 0 : 220,
        height: 0,
      });
    },
  );
  it("Taskbar가 없으면 trigger 상단을 사용하고 0인 상단도 보존한다", () => {
    const input = {
      variant: "search" as const,
      viewportWidth: 801,
      triggerBounds: { left: -10.5, top: 20.5, width: 180.5 },
    };
    expect(calculateTaskbarPanelAnchorRect(input)).toEqual({
      x: -10.5,
      y: 20.5,
      width: 180.5,
      height: 0,
    });
    expect(calculateTaskbarPanelAnchorRect({ ...input, taskbarTop: 0 }).y).toBe(0);
  });
});
