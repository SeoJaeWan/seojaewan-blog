import { describe, expect, it } from "vitest";

import type { WindowFrameState, WindowRect } from "../model/index.js";
import {
  constrainWindowBounds,
  createWindowBounds,
  getWindowBounds,
  InvalidWindowGeometryError,
  recoverWindowBounds,
  type WindowPlacementConfig,
} from "./index.js";

const config: WindowPlacementConfig = {
  defaultSize: { width: 400, height: 300 },
  minSize: { width: 240, height: 160 },
  edgeMargin: 20,
  cascadeOffset: { x: 32, y: 24 },
  titlebarRecoverySize: { width: 48, height: 32 },
};

describe("createWindowBounds", () => {
  it("첫 Window를 edge margin 안의 중앙에 배치한다", () => {
    expect(createWindowBounds({ x: 100, y: 50, width: 1_000, height: 800 }, null, config)).toEqual({
      x: 400,
      y: 300,
      width: 400,
      height: 300,
    });
  });

  it("다음 Window를 cascade하고 workArea 경계에서 제한한다", () => {
    const workArea = { x: 0, y: 0, width: 600, height: 500 };

    expect(
      createWindowBounds(workArea, { x: 100, y: 80, width: 400, height: 300 }, config),
    ).toEqual({ x: 132, y: 104, width: 400, height: 300 });
    expect(
      createWindowBounds(workArea, { x: 500, y: 440, width: 400, height: 300 }, config),
    ).toEqual({ x: 180, y: 180, width: 400, height: 300 });
  });

  it("새 Window의 기본 크기가 최소 크기보다 작으면 최소 크기를 적용한다", () => {
    expect(
      createWindowBounds({ x: 0, y: 0, width: 800, height: 600 }, null, {
        ...config,
        defaultSize: { width: 100, height: 80 },
      }),
    ).toEqual({ x: 280, y: 220, width: 240, height: 160 });
  });

  it("작은 workArea에서는 최소 크기보다 공간을 우선하고 새 Window를 normal로 유지한다", () => {
    expect(createWindowBounds({ x: 10, y: 20, width: 120, height: 90 }, null, config)).toEqual({
      x: 10,
      y: 20,
      width: 120,
      height: 90,
    });

    expect(createWindowBounds({ x: 10, y: 20, width: 0, height: 0 }, null, config)).toEqual({
      x: 10,
      y: 20,
      width: 400,
      height: 300,
    });
  });

  it.each([
    [{ x: 0, y: 0, width: Number.NaN, height: 500 }, config],
    [{ x: 0, y: 0, width: 500, height: -1 }, config],
    [
      { x: 0, y: 0, width: 500, height: 500 },
      { ...config, edgeMargin: Number.POSITIVE_INFINITY },
    ],
    [
      { x: 0, y: 0, width: 500, height: 500 },
      { ...config, minSize: { width: 0, height: 160 } },
    ],
  ] as const)("잘못된 workArea 또는 config를 거부한다", (workArea, invalidConfig) => {
    expect(() => createWindowBounds(workArea, null, invalidConfig)).toThrow(
      InvalidWindowGeometryError,
    );
  });

  it("유한한 입력의 계산이 숫자 범위를 넘으면 유효하지 않은 결과로 거부한다", () => {
    expect(() =>
      createWindowBounds(
        { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 500 },
        null,
        config,
      ),
    ).toThrow(InvalidWindowGeometryError);
  });
});

describe("constrainWindowBounds", () => {
  it("resize 후보에 최소 크기를 적용하고 workArea 안으로 제한한다", () => {
    expect(
      constrainWindowBounds(
        { x: -100, y: 900, width: 100, height: 80 },
        { x: 0, y: 0, width: 800, height: 600 },
        config,
      ),
    ).toEqual({ x: 20, y: 420, width: 240, height: 160 });
  });

  it("constrainWindowBounds는 양수가 아닌 normal bounds를 거부한다", () => {
    expect(() =>
      constrainWindowBounds(
        { x: 0, y: 0, width: 0, height: 100 },
        { x: 0, y: 0, width: 500, height: 500 },
        config,
      ),
    ).toThrow(InvalidWindowGeometryError);
  });
});

describe("recoverWindowBounds", () => {
  it("workArea 축소 시 normal size를 보존하고 titlebar 접근 영역을 복구한다", () => {
    expect(
      recoverWindowBounds(
        { x: 700, y: 600, width: 500, height: 400 },
        { x: 0, y: 0, width: 300, height: 200 },
        config,
      ),
    ).toEqual({ x: 252, y: 168, width: 500, height: 400 });

    expect(
      recoverWindowBounds(
        { x: -900, y: -500, width: 500, height: 400 },
        { x: 0, y: 0, width: 300, height: 200 },
        config,
      ),
    ).toEqual({ x: -452, y: 0, width: 500, height: 400 });

    expect(
      recoverWindowBounds(
        { x: 700, y: 600, width: 500, height: 400 },
        { x: 10, y: 20, width: 0, height: 0 },
        config,
      ),
    ).toEqual({ x: 10, y: 20, width: 500, height: 400 });
  });

  it("recoverWindowBounds는 유한하지 않은 좌표를 거부한다", () => {
    expect(() =>
      recoverWindowBounds(
        { x: -Infinity, y: 0, width: 100, height: 100 },
        { x: 0, y: 0, width: 500, height: 500 },
        config,
      ),
    ).toThrow(InvalidWindowGeometryError);
  });
});

describe("getWindowBounds", () => {
  it("maximized bounds를 workArea에서 파생하고 normalBounds와 입력을 바꾸지 않는다", () => {
    const normalBounds = Object.freeze({ x: 40, y: 60, width: 500, height: 400 });
    const frame: WindowFrameState = Object.freeze({
      normalBounds,
      placement: "maximized",
      minimized: false,
    });
    const workArea: WindowRect = Object.freeze({ x: 10, y: 20, width: 900, height: 700 });

    expect(getWindowBounds(frame, workArea)).toEqual(workArea);
    expect(getWindowBounds(frame, workArea)).not.toBe(workArea);
    expect(frame.normalBounds).toBe(normalBounds);
    expect(normalBounds).toEqual({ x: 40, y: 60, width: 500, height: 400 });
  });

  it("normal bounds는 복사해 반환하며 placement를 임의로 바꾸지 않는다", () => {
    const frame: WindowFrameState = {
      normalBounds: { x: 40, y: 60, width: 500, height: 400 },
      placement: "normal",
      minimized: true,
    };

    const result = getWindowBounds(frame, { x: 0, y: 0, width: 0, height: 0 });

    expect(result).toEqual(frame.normalBounds);
    expect(result).not.toBe(frame.normalBounds);
    expect(frame.placement).toBe("normal");
  });
});

describe.each([
  {
    name: "createWindowBounds",
    /**
     * 해당 geometry 함수에 원본 bounds와 workArea를 그대로 전달해 입력 보존을 관찰한다.
     */
    calculate: (bounds: WindowRect, area: WindowRect) => createWindowBounds(area, bounds, config),
  },
  {
    name: "constrainWindowBounds",
    /**
     * 해당 geometry 함수에 원본 bounds와 workArea를 그대로 전달해 입력 보존을 관찰한다.
     */
    calculate: (bounds: WindowRect, area: WindowRect) =>
      constrainWindowBounds(bounds, area, config),
  },
  {
    name: "recoverWindowBounds",
    /**
     * 해당 geometry 함수에 원본 bounds와 workArea를 그대로 전달해 입력 보존을 관찰한다.
     */
    calculate: (bounds: WindowRect, area: WindowRect) => recoverWindowBounds(bounds, area, config),
  },
])("$name 입력 보존", ({ calculate }) => {
  it("원본 bounds·workArea·config를 변경하지 않는다", () => {
    const bounds = { x: 50, y: 40, width: 400, height: 300 };
    const area = { x: 0, y: 0, width: 800, height: 600 };
    const before = structuredClone({ bounds, area, config });
    const result = calculate(bounds, area);
    expect({ bounds, area, config }).toEqual(before);
    expect(result).not.toBe(bounds);
    expect(result).not.toBe(area);
  });
});
