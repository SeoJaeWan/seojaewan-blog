import { describe, expect, expectTypeOf, it } from "vitest";

import * as design from "../../index.js";
import {
  getWindowBounds,
  selectWindowRoute,
  type WindowMode,
  type WindowState,
  WindowStore,
  type WindowStoreInitialization,
} from "../../index.js";

describe("Window package public API", () => {
  it("package root에서 Store, serializable model과 read-only selector를 소비할 수 있다", () => {
    const mode: WindowMode = "mobile";
    const state: WindowState = {
      mode,
      workArea: { x: 0, y: 0, width: 0, height: 0 },
      sessions: [],
      stackingOrder: [],
      activeSessionId: null,
    };

    expect(typeof WindowStore.initialize).toBe("function");
    expect(
      getWindowBounds(
        {
          normalBounds: { x: 1, y: 2, width: 3, height: 4 },
          placement: "normal",
          minimized: false,
        },
        state.workArea,
      ),
    ).toEqual({
      x: 1,
      y: 2,
      width: 3,
      height: 4,
    });
    expect(
      selectWindowRoute(state, { has: () => false, get: () => undefined, list: () => [] }),
    ).toBe("/");
    expectTypeOf<keyof WindowStoreInitialization>().toEqualTypeOf<
      "workspace" | "contentCatalog" | "placementConfig" | "mode" | "workArea"
    >();
  });

  it("package root는 Window 내부 계산과 ID parser를 runtime API로 노출하지 않는다", () => {
    expect(design).not.toHaveProperty("createWindowBounds");
    expect(design).not.toHaveProperty("constrainWindowBounds");
    expect(design).not.toHaveProperty("transitionWindowMode");
    expect(design).not.toHaveProperty("parseWindowSessionId");
    expect(design).not.toHaveProperty("parseChromeTabId");
    expect(design).not.toHaveProperty("parseFileExplorerTabId");
  });
});
