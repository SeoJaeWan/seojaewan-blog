/** @file Start screen state의 commit 구독과 instance 격리를 검증한다. */
import { describe, expect, it, vi } from "vitest";

import { createStartScreenState } from "./index.js";

describe("createStartScreenState", () => {
  it("changed command만 순서대로 commit하고 no-op은 subscriber를 호출하지 않는다", () => {
    const state = createStartScreenState();
    const observed: Array<ReturnType<typeof state.getSnapshot>> = [];
    state.subscribe(() => observed.push(state.getSnapshot()));

    state.setView("all");
    state.setView("all");
    state.setIndexOpen(true);
    state.reset();

    expect(observed).toEqual([
      { view: "all", indexOpen: false },
      { view: "all", indexOpen: true },
      { view: "pinned", indexOpen: false },
    ]);
  });

  it("unsubscribe는 idempotent하고 새 state instance는 snapshot과 listener를 공유하지 않는다", () => {
    const first = createStartScreenState();
    const second = createStartScreenState();
    const listener = vi.fn();
    const unsubscribe = first.subscribe(listener);

    unsubscribe();
    unsubscribe();
    first.setView("all");

    expect(listener).not.toHaveBeenCalled();
    expect(first.getSnapshot()).toEqual({ view: "all", indexOpen: false });
    expect(second.getSnapshot()).toEqual({ view: "pinned", indexOpen: false });
  });
});
