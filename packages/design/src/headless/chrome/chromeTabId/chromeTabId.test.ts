import { describe, expect, expectTypeOf, it } from "vitest";

import type { ResourceId } from "../../resources/index.js";
import type { WindowSessionId } from "../../windows/windowSessionId/index.js";
import {
  type ChromeTabId,
  InvalidChromeTabIdError,
  isChromeTabId,
  parseChromeTabId,
} from "./index.js";

const UUID = "32ba7bb6-ec55-48dc-8f4e-54e499bd82e8";

describe("parseChromeTabId", () => {
  it("유효한 UUID를 다른 identity와 구분되는 ChromeTabId로 해석한다", () => {
    const tabId = parseChromeTabId(UUID);

    expect(tabId).toBe(UUID);
    expectTypeOf<ChromeTabId>().not.toEqualTypeOf<ResourceId>();
    expectTypeOf<ChromeTabId>().not.toEqualTypeOf<WindowSessionId>();
  });

  it.each(["", "chrome-tab", "00000000-0000-0000-0000-000000000000"])(
    "지원하지 않는 UUID %s를 거부한다",
    (value) => {
      expect(() => parseChromeTabId(value)).toThrow(InvalidChromeTabIdError);
    },
  );
});

describe("isChromeTabId", () => {
  it("유효한 UUID이면 true를 반환한다", () => {
    expect(isChromeTabId(UUID)).toBe(true);
  });
  it.each(["", "invalid-id", "00000000-0000-0000-0000-000000000000"])(
    "잘못된 UUID %s이면 예외 없이 false를 반환한다",
    (value) => {
      expect(isChromeTabId(value)).toBe(false);
    },
  );
});
