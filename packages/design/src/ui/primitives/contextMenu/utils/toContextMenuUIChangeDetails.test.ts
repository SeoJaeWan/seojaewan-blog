import { describe, expect, it } from "vitest";

import { toContextMenuUIChangeDetails } from "./toContextMenuUIChangeDetails";

describe("toContextMenuUIChangeDetails", () => {
  it("vendor 변경 이유를 프로젝트 변경 세부 정보로 감싼다", () => {
    expect(toContextMenuUIChangeDetails("trigger-press")).toEqual({ reason: "trigger-press" });
  });
});
