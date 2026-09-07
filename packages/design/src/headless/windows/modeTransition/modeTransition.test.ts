import { describe, expect, it } from "vitest";

import { parseChromeTabId } from "../../chrome/index.js";
import type { ChromeWindowSession, WindowState } from "../model/index.js";
import { parseWindowSessionId } from "../windowSessionId/index.js";
import { transitionWindowMode } from "./index.js";

/**
 * 테스트별 충돌 여부를 제어할 수 있는 유효한 UUID 문자열을 만든다.
 */
const uuid = (value: number) => `10000000-0000-4000-8000-${String(value).padStart(12, "0")}`;

/**
 * 지정 identity와 위치를 가진 Chrome Session fixture를 만든다.
 */
const chromeSession = (value: number, minimized = false): ChromeWindowSession => {
  const tabId = parseChromeTabId(uuid(value + 100));
  return {
    id: parseWindowSessionId(uuid(value)),
    kind: "chrome",
    applicationId: "chrome",
    frame: {
      normalBounds: { x: 10, y: 10, width: 600, height: 400 },
      placement: "normal",
      minimized,
    },
    tabs: [
      {
        id: tabId,
        navigation: {
          current: { location: { kind: "new-tab" }, scrollTop: 0 },
          backStack: [],
          forwardStack: [],
        },
        reloadRevision: 0,
      },
    ],
    activeTabId: tabId,
  };
};

/**
 * 주어진 Session과 active ID로 독립된 WindowState fixture를 만든다.
 */
const stateWith = (
  sessions: readonly ChromeWindowSession[],
  activeSessionId: ChromeWindowSession["id"] | null,
): WindowState => ({
  mode: "desktop",
  workArea: { x: 0, y: 0, width: 1000, height: 800 },
  sessions,
  stackingOrder: sessions.map(({ id }) => id),
  activeSessionId,
});

describe("transitionWindowMode", () => {
  it("active가 없어도 가장 위 visible Session 하나를 mobile active로 선택한다", () => {
    const lower = chromeSession(1);
    const minimized = chromeSession(2, true);
    const upper = chromeSession(3);
    const state = stateWith([lower, minimized, upper], null);

    const result = transitionWindowMode(state, "mobile");

    expect(result).toMatchObject({
      mode: "mobile",
      sessions: [{ id: upper.id, frame: { minimized: false } }],
      stackingOrder: [upper.id],
      activeSessionId: upper.id,
    });
    expect(state.sessions).toHaveLength(3);
    expect(state.mode).toBe("desktop");
  });

  it("visible Session이 없으면 빈 mobile Desktop이 되고 desktop 복귀로 복원하지 않는다", () => {
    const state = stateWith([chromeSession(1, true), chromeSession(2, true)], null);

    const mobile = transitionWindowMode(state, "mobile");
    expect(mobile).toMatchObject({
      mode: "mobile",
      sessions: [],
      stackingOrder: [],
      activeSessionId: null,
    });
    if (mobile === null) throw new Error("expected transition");
    expect(transitionWindowMode(mobile, "desktop")).toMatchObject({
      mode: "desktop",
      sessions: [],
    });
  });
});
