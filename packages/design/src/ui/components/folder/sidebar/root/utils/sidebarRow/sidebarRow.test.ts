import { describe, expect, it } from "vitest";

import { createResourceRef } from "../../../../../../../headless/resources/index.js";
import { locationKey, rowKey, sameLocation } from "./index.js";

describe("sidebar row", () => {
  it("Desktop과 Folder 위치를 안정적인 row key로 변환한다", () => {
    const folder = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
    expect(locationKey(null)).toBe("desktop");
    expect(locationKey(folder)).toBe(`folder:${folder.id}`);
    expect(rowKey({ kind: "desktop", name: "Desktop", path: "/", current: true })).toBe("desktop");
  });

  it("위치는 객체 identity가 아니라 Folder identity로 비교한다", () => {
    const first = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
    const same = createResourceRef("folder", "30000000-0000-4000-8000-000000000001");
    const other = createResourceRef("folder", "30000000-0000-4000-8000-000000000002");
    expect(sameLocation(first, same)).toBe(true);
    expect(sameLocation(first, other)).toBe(false);
    expect(sameLocation(null, null)).toBe(true);
    expect(sameLocation(null, first)).toBe(false);
  });
});
