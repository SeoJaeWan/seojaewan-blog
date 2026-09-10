import { describe, expect, it } from "vitest";

import type { PrimaryPanelSnapshot } from "../model/index.js";
import { selectPrimaryPanelTriggerIntent, selectPrimaryPanelView } from "./index.js";

/**
 * selector 전제를 직접 표현하는 primary panel snapshot을 만든다.
 */
const snapshot = (activePanel: PrimaryPanelSnapshot["activePanel"]): PrimaryPanelSnapshot => ({
  activePanel,
  startQuery: "start query",
  searchQuery: "search query",
});

describe("selectPrimaryPanelTriggerIntent", () => {
  it("닫힌 상태에서는 요청한 Start와 Search를 여는 intent를 반환한다", () => {
    expect(selectPrimaryPanelTriggerIntent(snapshot(null), "start")).toEqual({
      kind: "open",
      panel: "start",
    });
    expect(selectPrimaryPanelTriggerIntent(snapshot(null), "search")).toEqual({
      kind: "open",
      panel: "search",
    });
  });

  it("active Start trigger는 toggle-close intent를 반환한다", () => {
    expect(selectPrimaryPanelTriggerIntent(snapshot("start"), "start")).toEqual({
      kind: "close",
      panel: "start",
    });
  });

  it("active Search trigger는 닫지 않는 maintain intent를 반환한다", () => {
    expect(selectPrimaryPanelTriggerIntent(snapshot("search"), "search")).toEqual({
      kind: "maintain",
      panel: "search",
    });
  });

  it("다른 panel trigger는 현재 panel과 요청 panel을 구분한 switch intent를 반환한다", () => {
    expect(selectPrimaryPanelTriggerIntent(snapshot("start"), "search")).toEqual({
      kind: "switch",
      from: "start",
      to: "search",
    });
    expect(selectPrimaryPanelTriggerIntent(snapshot("search"), "start")).toEqual({
      kind: "switch",
      from: "search",
      to: "start",
    });
  });
});

describe("selectPrimaryPanelView", () => {
  it("각 panel에 자신의 query와 active 여부만 투영한다", () => {
    const current = snapshot("search");

    expect(selectPrimaryPanelView(current, "start")).toEqual({
      panel: "start",
      active: false,
      query: "start query",
    });
    expect(selectPrimaryPanelView(current, "search")).toEqual({
      panel: "search",
      active: true,
      query: "search query",
    });
  });
});
