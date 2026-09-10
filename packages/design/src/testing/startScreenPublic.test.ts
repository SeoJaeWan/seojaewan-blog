import { describe, expect, it } from "vitest";

import {
  type StartScreenAction as FeatureStartScreenAction,
  useStartScreenController as useFeatureStartScreenController,
} from "../headless/start/index.js";
import {
  createHeadlessRuntime,
  type StartScreenAction,
  type StartScreenController,
  type StartScreenControllerViewModel,
  useStartScreenController,
} from "../index.js";

describe("Start screen public API", () => {
  it("package entry에서 controller type, hook과 독립 runtime Action을 함께 제공한다", () => {
    const runtime = createHeadlessRuntime();
    const action = { type: "set-view", view: "all" } satisfies StartScreenAction;
    const featureAction: FeatureStartScreenAction = action;
    const controllerHook: typeof useStartScreenController = useStartScreenController;
    const compileOnly = null as unknown as
      | StartScreenController
      | StartScreenControllerViewModel;

    runtime.startScreen.execute(featureAction);

    expect(controllerHook).toBeTypeOf("function");
    expect(useFeatureStartScreenController).toBe(useStartScreenController);
    expect(compileOnly).toBeNull();
    expect(runtime.startScreen.getSnapshot()).toEqual({
      status: "ready",
      snapshot: { view: "all", indexOpen: false },
    });
    expect(runtime.startScreen).toBeDefined();
    expect(runtime.start).toBeDefined();
  });
});
