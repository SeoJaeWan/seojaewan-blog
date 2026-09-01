import { describe, expect, expectTypeOf, it } from "vitest";

import { toMenuUIChangeDetails } from "./toMenuUIChangeDetails";

describe("toMenuUIChangeDetails", () => {
  it("vendor 세부 정보에서 새로운 프로젝트 변경 snapshot을 만든다", () => {
    const details = { reason: "item-press" } as const;
    const result = toMenuUIChangeDetails(details);

    expect(result).toEqual({ reason: "item-press" });
    expect(result).not.toBe(details);
    expectTypeOf<string>().not.toMatchTypeOf<Parameters<typeof toMenuUIChangeDetails>[0]>();
  });
});
