import { describe, expect, it } from "vitest";

import {
  createHeadlessRuntime,
  HeadlessRuntimeProvider,
  type HeadlessRuntimeProviderProps,
  type OperationHandle,
  type StartController,
  type StartControllerViewModel,
  type TaskbarController,
  type TaskbarControllerViewModel,
  useHeadlessRuntime,
  useStartController,
  useTaskbarController,
  useWindowController,
  useWorkspaceController,
  type WindowController,
  type WindowControllerViewModel,
  type WorkspaceController,
  type WorkspaceControllerViewModel,
} from "../index.js";

type PublicController =
  | WindowController
  | WorkspaceController
  | StartController
  | TaskbarController;
type PublicViewModel =
  | WindowControllerViewModel
  | WorkspaceControllerViewModel
  | StartControllerViewModel
  | TaskbarControllerViewModel;
type PublicHandle = OperationHandle<
  { status: "committed" },
  { status: "presented" },
  { status: "settled" }
>;

describe("package public consumer", () => {
  it("root entry에서 runtime, Provider, controller hook과 공개 type을 함께 가져온다", () => {
    const runtime = createHeadlessRuntime();
    const runtimeProvider: typeof HeadlessRuntimeProvider = HeadlessRuntimeProvider;
    const runtimeHook: typeof useHeadlessRuntime = useHeadlessRuntime;
    const controllerHooks = [
      useWindowController,
      useWorkspaceController,
      useStartController,
      useTaskbarController,
    ] as const;
    const compileOnly = null as unknown as
      | PublicController
      | PublicViewModel
      | PublicHandle
      | HeadlessRuntimeProviderProps;

    expect(runtimeProvider).toBeTypeOf("function");
    expect(runtimeHook).toBeTypeOf("function");
    expect(controllerHooks).toHaveLength(4);
    expect(runtime.transitions).toBeDefined();
    expect(compileOnly).toBeNull();
  });
});
