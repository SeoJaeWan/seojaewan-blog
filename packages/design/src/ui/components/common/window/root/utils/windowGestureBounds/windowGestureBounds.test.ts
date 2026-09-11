import { describe, expect, it, vi } from "vitest";

import type { WindowGestureHandle, WindowPlacementConfig, WindowSessionId } from "../../../../../../../headless/windows/index.js";
import { calculateWindowGestureBounds } from "./index.js";

const placementConfig: WindowPlacementConfig = {
  defaultSize: { width: 800, height: 600 }, minSize: { width: 400, height: 300 },
  edgeMargin: 16, cascadeOffset: { x: 24, y: 24 }, titlebarRecoverySize: { width: 120, height: 32 },
};
const makeHandle = (placement: "normal" | "maximized", kind: "move" | "resize") => ({
  sessionId: "10000000-0000-4000-8000-000000000001" as WindowSessionId,
  kind,
  startBounds: { x: 100, y: 80, width: placement === "maximized" ? 1000 : 600, height: placement === "maximized" ? 800 : 400 },
  startFrame: { placement, minimized: false, normalBounds: { x: 100, y: 80, width: 600, height: 400 } },
  update: vi.fn(), finish: vi.fn(), cancel: vi.fn(),
}) as unknown as WindowGestureHandle;

describe("calculateWindowGestureBounds", () => {
  it("normal move는 pointer delta만 반영하고 시작 bounds를 바꾸지 않는다", () => {
    const handle = makeHandle("normal", "move");
    const start = { ...handle.startBounds };
    expect(calculateWindowGestureBounds({ handle, placementConfig, resizeDirection: null, startPointer: { x: 150, y: 100 }, workArea: { x: 0, y: 0, width: 1000, height: 800 } }, { x: 180, y: 130 })).toEqual({ x: 130, y: 110, width: 600, height: 400 });
    expect(handle.startBounds).toEqual(start);
  });

  it("maximized move는 pointer 비율을 normal bounds에 적용해 복구 위치를 계산한다", () => {
    const handle = makeHandle("maximized", "move");
    expect(calculateWindowGestureBounds({ handle, placementConfig, resizeDirection: null, startPointer: { x: 600, y: 100 }, workArea: { x: 0, y: 0, width: 1000, height: 800 } }, { x: 700, y: 140 })).toEqual({ x: 400, y: 120, width: 600, height: 400 });
  });

  it("resize 방향이 없으면 시작 bounds를 반환하고 handle이 없으면 명시적으로 실패한다", () => {
    const handle = makeHandle("normal", "resize");
    const input = { handle, placementConfig, resizeDirection: null, startPointer: { x: 0, y: 0 }, workArea: { x: 0, y: 0, width: 1000, height: 800 } } as const;
    expect(calculateWindowGestureBounds(input, { x: 20, y: 30 })).toBe(handle.startBounds);
    expect(() => calculateWindowGestureBounds({ ...input, handle: null }, { x: 0, y: 0 })).toThrow("활성화되지 않은 Window gesture");
  });
});
