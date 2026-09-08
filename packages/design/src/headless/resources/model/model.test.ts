import { describe, expect, it } from "vitest";

import { createResourceRef, parseResourceRef } from "./index.js";
const CONTENT_ID = "01927d65-2354-7a55-95c1-8c1a77a43b42";

describe("createResourceRef", () => {
  it("종류와 UUID로 직렬화 가능한 ref를 만든다", () => {
    expect(JSON.stringify(createResourceRef("content", CONTENT_ID))).toBe(
      `{"kind":"content","id":"${CONTENT_ID}"}`,
    );
  });
  it("잘못된 UUID를 거부한다", () => {
    expect(() => createResourceRef("content", "invalid")).toThrow();
  });
  it("외부에서 ref identity를 바꿀 수 없게 동결한다", () => {
    const ref = createResourceRef("content", CONTENT_ID);
    expect(Object.isFrozen(ref)).toBe(true);
  });
});

describe("parseResourceRef", () => {
  it("직렬화한 ref의 kind와 identity를 복원한다", () => {
    const ref = createResourceRef("content", CONTENT_ID);
    expect(parseResourceRef(JSON.parse(JSON.stringify(ref)))).toEqual(ref);
  });
  it.each([
    { kind: "content", id: CONTENT_ID, title: "duplicated" },
    { kind: "iframe", id: CONTENT_ID },
    { kind: "content", id: "invalid" },
  ])("잘못된 입력 $kind/$id를 거부한다", (input) => {
    expect(() => parseResourceRef(input)).toThrow();
  });
  it("입력을 변경하지 않고 별도의 동결 ref를 반환한다", () => {
    const input = { kind: "content", id: CONTENT_ID };
    const parsed = parseResourceRef(input);
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
    expect(Object.isFrozen(parsed)).toBe(true);
    expect(Object.isFrozen(input)).toBe(false);
  });
});
