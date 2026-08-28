import { describe, expect, it } from "vitest";

import { toMenuUIChangeDetails } from "./toMenuUIChangeDetails";

describe("toMenuUIChangeDetails", () => {
  it("vendor 변경 이유를 프로젝트 변경 세부 정보로 감싼다", () => {
    expect(toMenuUIChangeDetails("item-press")).toEqual({ reason: "item-press" });
  });
});
