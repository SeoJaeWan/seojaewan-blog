import { describe, expect, it } from "vitest";

import type { PrimaryPanelSnapshot } from "../model/index.js";
import {
  activatePrimaryPanel,
  completePrimaryPanelClose,
  deactivatePrimaryPanel,
  updatePrimaryPanelQuery,
} from "./index.js";

/**
 * 명령별 전제를 짧게 표현하는 immutable primary panel snapshot을 만든다.
 */
const snapshot = (
  activePanel: PrimaryPanelSnapshot["activePanel"] = null,
  startQuery = "start query",
  searchQuery = "search query",
): PrimaryPanelSnapshot => Object.freeze({ activePanel, startQuery, searchQuery });

describe("activatePrimaryPanel", () => {
  it("닫힌 상태에서 요청 panel 하나만 active로 만든다", () => {
    const current = snapshot(null);
    const result = activatePrimaryPanel(current, "start");

    expect(result).toEqual({
      status: "changed",
      snapshot: { activePanel: "start", startQuery: "start query", searchQuery: "search query" },
      change: { kind: "activated", panel: "start" },
    });
    expect(current.activePanel).toBeNull();
    expect(Object.isFrozen(result.snapshot)).toBe(true);
  });

  it("같은 panel을 다시 열면 snapshot identity를 유지하는 no-op이다", () => {
    const current = snapshot("search");
    const result = activatePrimaryPanel(current, "search");

    expect(result).toEqual({ status: "no-op", snapshot: current, change: null });
    expect(result.snapshot).toBe(current);
  });

  it("다른 panel이 active면 query를 지우거나 동시에 교체하지 않고 거절한다", () => {
    const current = snapshot("search");
    const result = activatePrimaryPanel(current, "start");

    expect(result).toEqual({
      status: "rejected",
      snapshot: current,
      change: null,
      reason: "another-panel-active",
    });
    expect(result.snapshot).toBe(current);
  });
});

describe("deactivatePrimaryPanel", () => {
  it("현재 panel identity만 제거하고 두 query를 close 완료까지 보존한다", () => {
    expect(deactivatePrimaryPanel(snapshot("start"), "start")).toEqual({
      status: "changed",
      snapshot: { activePanel: null, startQuery: "start query", searchQuery: "search query" },
      change: { kind: "deactivated", panel: "start" },
    });
  });

  it("다른 panel의 stale close 요청은 active identity와 query를 보존한다", () => {
    const current = snapshot("search");
    const result = deactivatePrimaryPanel(current, "start");

    expect(result.snapshot).toBe(current);
    expect(result.status).toBe("no-op");
  });
});

describe("updatePrimaryPanelQuery", () => {
  it("Start query 변경에서 Search query와 active identity를 보존한다", () => {
    expect(updatePrimaryPanelQuery(snapshot("search"), "start", "  새 입력  ")).toEqual({
      status: "changed",
      snapshot: { activePanel: "search", startQuery: "  새 입력  ", searchQuery: "search query" },
      change: { kind: "query-updated", panel: "start", query: "  새 입력  " },
    });
  });

  it("Search query 변경에서 Start query를 보존한다", () => {
    expect(updatePrimaryPanelQuery(snapshot("start"), "search", "검색")).toEqual({
      status: "changed",
      snapshot: { activePanel: "start", startQuery: "start query", searchQuery: "검색" },
      change: { kind: "query-updated", panel: "search", query: "검색" },
    });
  });

  it("동일 query는 snapshot identity를 유지하는 no-op이다", () => {
    const current = snapshot();
    const result = updatePrimaryPanelQuery(current, "search", "search query");

    expect(result.snapshot).toBe(current);
    expect(result.status).toBe("no-op");
  });
});

describe("completePrimaryPanelClose", () => {
  it("Start close 완료에서 Start query만 초기화한다", () => {
    expect(completePrimaryPanelClose(snapshot(null), "start")).toEqual({
      status: "changed",
      snapshot: { activePanel: null, startQuery: "", searchQuery: "search query" },
      change: { kind: "query-reset", panel: "start" },
    });
  });

  it("Search close 완료에서 Search query만 초기화한다", () => {
    expect(completePrimaryPanelClose(snapshot("start"), "search")).toEqual({
      status: "changed",
      snapshot: { activePanel: "start", startQuery: "start query", searchQuery: "" },
      change: { kind: "query-reset", panel: "search" },
    });
  });

  it("같은 panel이 다시 active인 늦은 완료는 새 query를 보존한다", () => {
    const current = snapshot("search", "start query", "새 검색");
    const result = completePrimaryPanelClose(current, "search");

    expect(result.snapshot).toBe(current);
    expect(result.status).toBe("no-op");
  });
});
