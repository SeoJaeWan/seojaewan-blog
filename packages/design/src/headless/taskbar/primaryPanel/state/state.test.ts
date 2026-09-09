import { describe, expect, it, vi } from "vitest";

import { createPrimaryPanelState } from "./index.js";

describe("createPrimaryPanelState", () => {
  it("Start toggle에 필요한 activate와 deactivate commit을 순서대로 구독시킨다", () => {
    const state = createPrimaryPanelState();
    const observed: Array<ReturnType<typeof state.getSnapshot>> = [];
    state.subscribe(() => observed.push(state.getSnapshot()));

    state.activate("start");
    state.deactivate("start");

    expect(observed).toEqual([
      { activePanel: "start", startQuery: "", searchQuery: "" },
      { activePanel: null, startQuery: "", searchQuery: "" },
    ]);
  });

  it("다른 panel activation 거절에서는 query와 subscriber 알림을 보존한다", () => {
    const state = createPrimaryPanelState();
    const listener = vi.fn();
    state.activate("search");
    state.updateQuery("search", "검색 유지");
    state.subscribe(listener);

    const result = state.activate("start");

    expect(result.status).toBe("rejected");
    expect(state.getSnapshot()).toEqual({
      activePanel: "search",
      startQuery: "",
      searchQuery: "검색 유지",
    });
    expect(listener).not.toHaveBeenCalled();
  });

  it("close 요청과 완료 사이 query를 유지하고 완료 때 닫힌 panel query만 초기화한다", () => {
    const state = createPrimaryPanelState();
    state.updateQuery("start", "시작 입력");
    state.updateQuery("search", "검색 입력");
    state.activate("search");

    state.deactivate("search");
    expect(state.getSnapshot().searchQuery).toBe("검색 입력");

    state.completeClose("search");
    expect(state.getSnapshot()).toEqual({
      activePanel: null,
      startQuery: "시작 입력",
      searchQuery: "",
    });
  });

  it("동일 query no-op과 unsubscribe 뒤 commit에서는 listener를 호출하지 않는다", () => {
    const state = createPrimaryPanelState();
    const listener = vi.fn();
    const unsubscribe = state.subscribe(listener);

    state.updateQuery("start", "");
    expect(listener).not.toHaveBeenCalled();

    unsubscribe();
    unsubscribe();
    state.updateQuery("start", "입력");
    expect(listener).not.toHaveBeenCalled();
  });

  it("새 state 인스턴스끼리 snapshot과 subscriber를 공유하지 않는다", () => {
    const first = createPrimaryPanelState();
    const second = createPrimaryPanelState();

    first.activate("start");

    expect(first.getSnapshot().activePanel).toBe("start");
    expect(second.getSnapshot().activePanel).toBeNull();
  });
});
