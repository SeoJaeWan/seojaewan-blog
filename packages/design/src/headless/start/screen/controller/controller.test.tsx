import { createElement } from "react";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { createHeadlessRuntime, HeadlessRuntimeProvider } from "../../../runtime/index.js";
import { useStartScreenController } from "./index.js";

afterEach(() => cleanup());

describe("useStartScreenController", () => {
  it("semantic snapshot을 구독하고 runtime identity 동안 같은 Action 묶음을 유지한다", () => {
    const runtime = createHeadlessRuntime();
    const observations: ReturnType<typeof useStartScreenController>[] = [];
    const Probe = () => {
      observations.push(useStartScreenController());
      return null;
    };
    render(createElement(HeadlessRuntimeProvider, { runtime }, createElement(Probe)));
    const actions = observations.at(-1)!.actions;

    act(() => {
      actions.execute({ type: "set-view", view: "all" });
      actions.execute({ type: "set-index-open", open: true });
    });

    expect(observations.at(-1)?.viewModel).toEqual({
      status: "ready",
      snapshot: { view: "all", indexOpen: true },
    });
    expect(observations.at(-1)?.actions).toBe(actions);
  });
});
