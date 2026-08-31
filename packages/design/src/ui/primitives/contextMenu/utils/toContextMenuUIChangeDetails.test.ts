import { describe, expect, expectTypeOf, it } from "vitest";

import { toContextMenuUIChangeDetails } from "./toContextMenuUIChangeDetails";

describe("toContextMenuUIChangeDetails", () => {
  it("vendor 세부 정보에서 새로운 프로젝트 변경 snapshot을 만든다", () => {
    const details = { reason: "trigger-press" } as const;
    const result = toContextMenuUIChangeDetails(details);

    expect(result).toEqual({ reason: "trigger-press" });
    expect(result).not.toBe(details);
    expectTypeOf<string>().not.toMatchTypeOf<Parameters<typeof toContextMenuUIChangeDetails>[0]>();
  });
});
