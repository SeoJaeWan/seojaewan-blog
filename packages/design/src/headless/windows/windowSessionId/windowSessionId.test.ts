import { describe, expect, expectTypeOf, it } from "vitest";

import type { ResourceId } from "../../resources/index.js";
import {
  InvalidWindowSessionIdError,
  isWindowSessionId,
  parseWindowSessionId,
  type WindowSessionId,
} from "./index.js";

const UUID = "1a3c6e0e-22ec-4a58-a15c-5e19e8b1e34d";

describe("parseWindowSessionId", () => {
  it("유효한 UUID를 ResourceId와 다른 WindowSessionId로 해석한다", () => {
    const sessionId = parseWindowSessionId(UUID);

    expect(sessionId).toBe(UUID);
    expectTypeOf<WindowSessionId>().not.toEqualTypeOf<ResourceId>();
  });

  it.each(["", "resource-1", "00000000-0000-0000-0000-000000000000"])(
    "지원하지 않는 UUID %s를 거부한다",
    (value) => {
      expect(() => parseWindowSessionId(value)).toThrow(InvalidWindowSessionIdError);
    },
  );
});

describe("isWindowSessionId", () => {
  it("유효한 UUID이면 true를 반환한다", () => {
    expect(isWindowSessionId(UUID)).toBe(true);
  });
  it.each(["", "invalid-id", "00000000-0000-0000-0000-000000000000"])(
    "잘못된 UUID %s이면 예외 없이 false를 반환한다",
    (value) => {
      expect(isWindowSessionId(value)).toBe(false);
    },
  );
});
