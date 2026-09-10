import { describe, expect, it } from "vitest";

import { createInitialPrimaryPanelSnapshot } from "./index.js";

describe("createInitialPrimaryPanelSnapshot", () => {
  it("active panel 없이 Start와 Search query를 독립된 빈 값으로 시작한다", () => {
    expect(createInitialPrimaryPanelSnapshot()).toEqual({
      activePanel: null,
      startQuery: "",
      searchQuery: "",
    });
  });

  it("호출마다 새 immutable snapshot을 반환한다", () => {
    const first = createInitialPrimaryPanelSnapshot();
    const second = createInitialPrimaryPanelSnapshot();

    expect(first).not.toBe(second);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(second)).toBe(true);
  });
});
