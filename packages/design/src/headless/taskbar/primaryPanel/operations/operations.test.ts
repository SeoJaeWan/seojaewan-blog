import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { TransitionRegistry } from "../../../runtime/index.js";
import { createPrimaryPanelState } from "../state/index.js";
import {
  PRIMARY_PANEL_ENTER_PHASE,
  PRIMARY_PANEL_EXIT_PHASE,
  PrimaryPanelOperations,
} from "./index.js";

/** 각 test가 responsive mode를 명시적으로 바꿀 수 있는 Operation fixture다. */
const createFixture = () => {
  let mode: "desktop" | "mobile" | "not-ready" = "desktop";
  const state = createPrimaryPanelState();
  const transitions = new TransitionRegistry();
  const operations = new PrimaryPanelOperations({
    state,
    transitions,
    modeReader: { getMode: () => mode },
  });
  return { operations, state, transitions, setMode: (value: typeof mode) => (mode = value) };
};

/** queue executor가 synchronous state commit과 transition wait 등록까지 진행하게 한다. */
const flushQueue = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
};

describe("PrimaryPanelOperations", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("현재 panel exit 완료 뒤 query를 초기화하고 다음 panel을 연다", async () => {
    const { operations, state, transitions } = createFixture();
    state.activate("start");
    state.updateQuery("start", "시작 입력");

    const handle = operations.execute({ type: "trigger", panel: "search" });
    await flushQueue();

    expect(state.getSnapshot()).toEqual({
      activePanel: null,
      startQuery: "시작 입력",
      searchQuery: "",
    });
    expect(transitions.complete(handle.operationId, PRIMARY_PANEL_ENTER_PHASE)).toBe(false);
    expect(transitions.complete(handle.operationId, PRIMARY_PANEL_EXIT_PHASE)).toBe(true);

    await expect(handle.committed).resolves.toMatchObject({ status: "committed" });
    expect(state.getSnapshot()).toEqual({
      activePanel: "search",
      startQuery: "",
      searchQuery: "",
    });
    expect(transitions.complete(handle.operationId, PRIMARY_PANEL_ENTER_PHASE)).toBe(true);
    await expect(handle.settled).resolves.toMatchObject({
      status: "settled",
      presentation: { status: "sequence-completed" },
    });
  });

  it("연속 trigger 요청을 버리지 않고 각 transition settled 뒤 최신 상태에서 실행한다", async () => {
    const { operations, state, transitions } = createFixture();
    const first = operations.execute({ type: "trigger", panel: "start" });
    const second = operations.execute({ type: "trigger", panel: "search" });
    const third = operations.execute({ type: "trigger", panel: "start" });

    await first.committed;
    expect(state.getSnapshot().activePanel).toBe("start");
    transitions.complete(first.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await first.settled;

    await flushQueue();
    expect(state.getSnapshot().activePanel).toBeNull();
    transitions.complete(second.operationId, PRIMARY_PANEL_EXIT_PHASE);
    await second.committed;
    expect(state.getSnapshot().activePanel).toBe("search");
    transitions.complete(second.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await second.settled;

    await flushQueue();
    expect(state.getSnapshot().activePanel).toBeNull();
    transitions.complete(third.operationId, PRIMARY_PANEL_EXIT_PHASE);
    await third.committed;
    expect(state.getSnapshot().activePanel).toBe("start");
    transitions.complete(third.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await third.settled;
  });

  it("opening 중 query 변경을 transition queue 뒤로 지연하지 않는다", async () => {
    const { operations, state, transitions } = createFixture();
    const opening = operations.execute({ type: "trigger", panel: "search" });
    await opening.committed;

    const query = operations.execute({
      type: "update-query",
      panel: "search",
      query: "한글  입력",
    });
    await expect(query.settled).resolves.toMatchObject({ status: "settled" });
    expect(state.getSnapshot().searchQuery).toBe("한글  입력");

    transitions.complete(opening.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await opening.settled;
  });

  it("Component 중단을 정상 완료와 구분하면서 close 정리와 다음 open을 계속한다", async () => {
    const { operations, state, transitions } = createFixture();
    state.activate("start");
    state.updateQuery("start", "정리 대상");
    const handle = operations.execute({ type: "trigger", panel: "search" });
    await flushQueue();

    expect(transitions.abort(handle.operationId, PRIMARY_PANEL_EXIT_PHASE, "unmounted")).toBe(true);
    await handle.committed;
    expect(state.getSnapshot()).toMatchObject({ activePanel: "search", startQuery: "" });
    transitions.complete(handle.operationId, PRIMARY_PANEL_ENTER_PHASE);

    await expect(handle.presented).resolves.toMatchObject({
      status: "sequence-completed",
      results: [{ status: "aborted" }, { status: "completed" }],
    });
  });

  it("watchdog 뒤 늦은 완료를 무시하고 다음 요청 queue를 진행한다", async () => {
    const { operations, state, transitions } = createFixture();
    const first = operations.execute({ type: "trigger", panel: "start" });
    const second = operations.execute({ type: "trigger", panel: "start" });
    await first.committed;

    await vi.advanceTimersByTimeAsync(1_000);
    await expect(first.presented).resolves.toMatchObject({ status: "watchdog" });
    expect(transitions.complete(first.operationId, PRIMARY_PANEL_ENTER_PHASE)).toBe(false);

    await flushQueue();
    expect(state.getSnapshot().activePanel).toBeNull();
    transitions.complete(second.operationId, PRIMARY_PANEL_EXIT_PHASE);
    await expect(second.settled).resolves.toMatchObject({ status: "settled" });
  });

  it("switch exit 중 mobile 진입은 대기 target open을 무효화한다", async () => {
    const { operations, state, transitions, setMode } = createFixture();
    state.activate("start");
    const switching = operations.execute({ type: "trigger", panel: "search" });
    await flushQueue();

    setMode("mobile");
    const mobile = operations.execute({ type: "dismiss-for-mobile" });
    transitions.complete(switching.operationId, PRIMARY_PANEL_EXIT_PHASE);

    await expect(switching.settled).resolves.toMatchObject({ status: "settled" });
    await expect(mobile.settled).resolves.toMatchObject({
      result: { status: "no-op", reason: "already-closed" },
    });
    expect(state.getSnapshot().activePanel).toBeNull();
    expect(transitions.complete(switching.operationId, PRIMARY_PANEL_ENTER_PHASE)).toBe(false);
  });

  it("앞 transition 뒤에 대기하던 desktop trigger는 mobile 신호 후 실행하지 않는다", async () => {
    const { operations, state, transitions, setMode } = createFixture();
    const opening = operations.execute({ type: "trigger", panel: "start" });
    const pendingSearch = operations.execute({ type: "trigger", panel: "search" });
    await opening.committed;

    setMode("mobile");
    const mobile = operations.execute({ type: "dismiss-for-mobile" });
    transitions.complete(opening.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await opening.settled;

    await expect(pendingSearch.settled).resolves.toMatchObject({
      result: { status: "rejected", reason: "stale-desktop-request" },
    });
    await flushQueue();
    expect(state.getSnapshot().activePanel).toBeNull();
    transitions.abort(mobile.operationId, PRIMARY_PANEL_EXIT_PHASE, "mobile-unmounted");
    await mobile.settled;
    expect(state.getSnapshot().activePanel).toBeNull();
  });

  it("실행 시점이 mobile 또는 준비 전이면 desktop panel activation을 거절한다", async () => {
    const { operations, state, setMode } = createFixture();
    setMode("not-ready");
    const notReady = operations.execute({ type: "trigger", panel: "start" });
    await expect(notReady.committed).resolves.toMatchObject({
      status: "rejected",
      reason: "desktop-unavailable",
    });

    setMode("mobile");
    const mobile = operations.execute({ type: "trigger", panel: "search" });
    await expect(mobile.settled).resolves.toMatchObject({
      result: { status: "rejected", reason: "desktop-unavailable" },
    });
    expect(state.getSnapshot().activePanel).toBeNull();
  });

  it("Resource open 실패는 Search query를 보존하고 성공은 close 완료 뒤 초기화한다", async () => {
    const { operations, state, transitions } = createFixture();
    const opening = operations.execute({ type: "trigger", panel: "search" });
    await opening.committed;
    transitions.complete(opening.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await opening.settled;
    await operations.execute({ type: "update-query", panel: "search", query: "검색어" }).settled;

    await operations.execute({ type: "track-resource-open", requestId: "failed" }).settled;
    const failed = operations.execute({
      type: "settle-resource-open",
      requestId: "failed",
      outcome: "failed",
    });
    await expect(failed.settled).resolves.toMatchObject({
      result: { status: "no-op", reason: "resource-open-failed" },
    });
    expect(state.getSnapshot()).toMatchObject({ activePanel: "search", searchQuery: "검색어" });

    await operations.execute({ type: "track-resource-open", requestId: "success" }).settled;
    const succeeded = operations.execute({
      type: "settle-resource-open",
      requestId: "success",
      outcome: "succeeded",
    });
    await flushQueue();
    expect(state.getSnapshot()).toMatchObject({ activePanel: null, searchQuery: "검색어" });
    transitions.complete(succeeded.operationId, PRIMARY_PANEL_EXIT_PHASE);
    await succeeded.settled;
    expect(state.getSnapshot().searchQuery).toBe("");
  });

  it("Start Resource open의 실패는 상태를 유지하고 현재 성공만 close 완료 뒤 초기화한다", async () => {
    const { operations, state, transitions } = createFixture();
    const opening = operations.execute({ type: "trigger", panel: "start" });
    await opening.committed;
    transitions.complete(opening.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await opening.settled;
    await operations.execute({ type: "update-query", panel: "start", query: "시작 상태" }).settled;

    await operations.execute({ type: "track-resource-open", panel: "start", requestId: "failed" })
      .settled;
    const failed = operations.execute({
      type: "settle-resource-open",
      requestId: "failed",
      outcome: "failed",
    });
    await expect(failed.settled).resolves.toMatchObject({
      result: { status: "no-op", reason: "resource-open-failed" },
    });
    expect(state.getSnapshot()).toMatchObject({ activePanel: "start", startQuery: "시작 상태" });

    await operations.execute({ type: "track-resource-open", panel: "start", requestId: "success" })
      .settled;
    const succeeded = operations.execute({
      type: "settle-resource-open",
      requestId: "success",
      outcome: "succeeded",
    });
    await flushQueue();
    expect(state.getSnapshot()).toMatchObject({ activePanel: null, startQuery: "시작 상태" });
    transitions.complete(succeeded.operationId, PRIMARY_PANEL_EXIT_PHASE);
    await succeeded.settled;
    expect(state.getSnapshot().startQuery).toBe("");
  });

  it("Resource request ID 중복과 active가 아닌 panel 추적을 서로 구분한다", async () => {
    const { operations, transitions } = createFixture();
    const opening = operations.execute({ type: "trigger", panel: "start" });
    await opening.committed;
    transitions.complete(opening.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await opening.settled;

    const tracked = operations.execute({
      type: "track-resource-open",
      panel: "start",
      requestId: "same-request",
    });
    await expect(tracked.settled).resolves.toMatchObject({
      result: { status: "tracked", action: { panel: "start" } },
    });
    const duplicate = operations.execute({
      type: "track-resource-open",
      panel: "start",
      requestId: "same-request",
    });
    await expect(duplicate.settled).resolves.toMatchObject({
      result: { status: "rejected", reason: "duplicate-request" },
    });
    const inactive = operations.execute({
      type: "track-resource-open",
      panel: "search",
      requestId: "inactive-panel",
    });
    await expect(inactive.settled).resolves.toMatchObject({
      result: { status: "rejected", reason: "panel-not-active" },
    });
  });

  it("이전 Start activation의 늦은 Resource 성공이 Search activation을 닫지 않는다", async () => {
    const { operations, state, transitions } = createFixture();
    const start = operations.execute({ type: "trigger", panel: "start" });
    await start.committed;
    transitions.complete(start.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await start.settled;
    await operations.execute({ type: "track-resource-open", panel: "start", requestId: "late" })
      .settled;

    const search = operations.execute({ type: "trigger", panel: "search" });
    await flushQueue();
    transitions.complete(search.operationId, PRIMARY_PANEL_EXIT_PHASE);
    await search.committed;
    transitions.complete(search.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await search.settled;
    await operations.execute({ type: "update-query", panel: "search", query: "새 검색" }).settled;

    const late = operations.execute({
      type: "settle-resource-open",
      requestId: "late",
      outcome: "succeeded",
    });
    await expect(late.settled).resolves.toMatchObject({
      result: { status: "no-op", reason: "stale-resource-open" },
    });
    expect(state.getSnapshot()).toMatchObject({ activePanel: "search", searchQuery: "새 검색" });
  });

  it("이전 Search activation의 늦은 Resource 성공이 다시 연 panel을 닫지 않는다", async () => {
    const { operations, state, transitions } = createFixture();
    const firstOpen = operations.execute({ type: "trigger", panel: "search" });
    await firstOpen.committed;
    transitions.complete(firstOpen.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await firstOpen.settled;
    await operations.execute({ type: "track-resource-open", requestId: "late" }).settled;

    const close = operations.execute({
      type: "dismiss",
      panel: "search",
      reason: "outside-interaction",
    });
    await flushQueue();
    transitions.complete(close.operationId, PRIMARY_PANEL_EXIT_PHASE);
    await close.settled;
    const reopened = operations.execute({ type: "trigger", panel: "search" });
    await reopened.committed;
    transitions.complete(reopened.operationId, PRIMARY_PANEL_ENTER_PHASE);
    await reopened.settled;
    await operations.execute({ type: "update-query", panel: "search", query: "새 검색" }).settled;

    const late = operations.execute({
      type: "settle-resource-open",
      requestId: "late",
      outcome: "succeeded",
    });
    await expect(late.settled).resolves.toMatchObject({
      result: { status: "no-op", reason: "stale-resource-open" },
    });
    expect(state.getSnapshot()).toMatchObject({ activePanel: "search", searchQuery: "새 검색" });
  });
});
