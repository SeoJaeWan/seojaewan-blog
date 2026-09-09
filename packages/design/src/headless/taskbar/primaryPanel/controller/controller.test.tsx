import { createElement } from "react";
import { renderToString } from "react-dom/server";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import {
  createHeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
} from "../../../runtime/index.js";
import type { WindowState } from "../../../windows/model/index.js";
import { usePrimaryPanelController } from "./index.js";

const desktopSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

const createRuntime = () => {
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  return createHeadlessRuntime({ adapters: { windows } });
};

afterEach(() => cleanup());

describe("usePrimaryPanelController", () => {
  it("SSR에서는 runtime-local panel state를 읽지 않고 준비 전 결과를 제공한다", () => {
    const runtime = createRuntime();
    const statuses: string[] = [];
    const Probe = () => {
      statuses.push(usePrimaryPanelController().viewModel.status);
      return null;
    };

    renderToString(
      createElement(HeadlessRuntimeProvider, { runtime }, createElement(Probe)),
    );

    expect(statuses).toEqual(["not-ready"]);
  });

  it("query commit을 구독하고 runtime identity 동안 같은 Action 묶음을 유지한다", async () => {
    const runtime = createRuntime();
    const observations: ReturnType<typeof usePrimaryPanelController>[] = [];
    const Probe = () => {
      observations.push(usePrimaryPanelController());
      return null;
    };
    render(createElement(HeadlessRuntimeProvider, { runtime }, createElement(Probe)));
    const initialActions = observations.at(-1)!.actions;

    await act(async () => {
      await initialActions.execute({
        type: "update-query",
        panel: "search",
        query: "한글  입력",
      }).settled;
    });

    expect(observations.at(-1)?.viewModel).toEqual({
      status: "ready",
      snapshot: { activePanel: null, startQuery: "", searchQuery: "한글  입력" },
    });
    expect(observations.at(-1)?.actions).toBe(initialActions);
  });
});
