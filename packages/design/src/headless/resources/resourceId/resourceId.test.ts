import { describe, expect, it } from "vitest";

import { InvalidResourceIdError, isResourceId, parseResourceId } from "./index.js";

const CONTENT_ID = "01927d65-2354-7a55-95c1-8c1a77a43b42";

describe("parseResourceId", () => {
  it("유효한 UUID를 변경하지 않고 ResourceId로 좁힌다", () => {
    expect(parseResourceId(CONTENT_ID)).toBe(CONTENT_ID);
  });

  it.each([
    "",
    "content-from-slug",
    "01927d6523547a5595c18c1a77a43b42",
    "01927d65-2354-0a55-95c1-8c1a77a43b42",
    "01927d65-2354-7a55-05c1-8c1a77a43b42",
  ])("잘못된 UUID 형식을 거부한다: %s", (value) => {
    expect(() => parseResourceId(value)).toThrow(InvalidResourceIdError);
  });
});

describe("isResourceId", () => {
  it("유효한 UUID이면 true를 반환한다", () => {
    expect(isResourceId(CONTENT_ID)).toBe(true);
  });
  it.each([
    "",
    "content-from-slug",
    "01927d6523547a5595c18c1a77a43b42",
    "01927d65-2354-0a55-95c1-8c1a77a43b42",
    "01927d65-2354-7a55-05c1-8c1a77a43b42",
  ])("잘못된 UUID %s이면 예외 없이 false를 반환한다", (value) => {
    expect(isResourceId(value)).toBe(false);
  });
});
