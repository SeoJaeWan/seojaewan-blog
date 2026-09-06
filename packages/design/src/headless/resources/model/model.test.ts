import { describe, expect, it } from "vitest";

import { createResourceRef, parseResourceRef } from "./index.js";

const CONTENT_ID = "01927d65-2354-7a55-95c1-8c1a77a43b42";

describe("Resource model", () => {
  it("kind와 id만 직렬화하고 같은 discriminated ref로 복원한다", () => {
    const ref = createResourceRef("content", CONTENT_ID);
    const serialized = JSON.stringify(ref);
    const restored = parseResourceRef(JSON.parse(serialized));

    expect(serialized).toBe(`{"kind":"content","id":"${CONTENT_ID}"}`);
    expect(restored).toEqual(ref);
    expect(restored.kind).toBe("content");
    expect(Object.isFrozen(ref)).toBe(true);
    expect(Object.isFrozen(restored)).toBe(true);
  });

  it("원본 데이터를 포함하거나 지원하지 않는 kind를 가진 ref를 거부한다", () => {
    expect(() =>
      parseResourceRef({ kind: "content", id: CONTENT_ID, title: "duplicated title" }),
    ).toThrow("ResourceRef에는 kind와 id만 포함되어야 합니다");
    expect(() => parseResourceRef({ kind: "iframe", id: CONTENT_ID })).toThrow(
      "ResourceRef에는 지원하는 kind와 UUID id가 필요합니다",
    );
  });
});
