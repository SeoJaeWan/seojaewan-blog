import { describe, expect, it } from "vitest";

import {
  createResourceRef,
  InvalidResourceIdError,
  isResourceId,
  parseResourceId,
  parseResourceRef,
} from "./index.js";

const CONTENT_ID = "01927d65-2354-7a55-95c1-8c1a77a43b42";

describe("Resource identity", () => {
  it("유효한 UUID를 변경하지 않고 ResourceId로 좁힌다", () => {
    expect(parseResourceId(CONTENT_ID)).toBe(CONTENT_ID);
    expect(isResourceId(CONTENT_ID)).toBe(true);
  });

  it.each([
    "",
    "content-from-slug",
    "01927d6523547a5595c18c1a77a43b42",
    "01927d65-2354-0a55-95c1-8c1a77a43b42",
    "01927d65-2354-7a55-05c1-8c1a77a43b42",
  ])("잘못된 UUID 형식을 거부한다: %s", (value) => {
    expect(() => parseResourceId(value)).toThrow(InvalidResourceIdError);
    expect(isResourceId(value)).toBe(false);
  });

  it("kind와 id만 직렬화하고 같은 discriminated ref로 복원한다", () => {
    const ref = createResourceRef("content", CONTENT_ID);
    const serialized = JSON.stringify(ref);
    const restored = parseResourceRef(JSON.parse(serialized));

    expect(serialized).toBe(`{"kind":"content","id":"${CONTENT_ID}"}`);
    expect(restored).toEqual(ref);
    expect(restored.kind).toBe("content");
    expect(Object.isFrozen(restored)).toBe(true);
  });

  it("원본 데이터를 포함하거나 지원하지 않는 kind를 가진 ref를 거부한다", () => {
    expect(() =>
      parseResourceRef({ kind: "content", id: CONTENT_ID, title: "duplicated title" }),
    ).toThrow("only kind and id");
    expect(() => parseResourceRef({ kind: "iframe", id: CONTENT_ID })).toThrow("supported kind");
  });
});
