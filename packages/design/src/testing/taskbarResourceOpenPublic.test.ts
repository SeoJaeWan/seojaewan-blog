import { describe, expect, it, vi } from "vitest";

import {
  createHeadlessRuntime,
  type ExternalShortcutNavigationPort,
  type ResourceOpenAction,
  ResourceOpenOperations,
  type ResourceOpenResult,
} from "../headless/index.js";
import { ResourceOpenOperations as FeatureResourceOpenOperations } from "../headless/taskbar/index.js";

const action = Object.freeze({
  type: "open-external-shortcut",
  url: "https://example.com/start",
  target: "_blank",
}) satisfies ResourceOpenAction;

describe("Taskbar Resource open public API", () => {
  it("headless entry와 runtime construction에서 external navigation 결과를 공개한다", async () => {
    const openNewTab = vi.fn(() => Object.freeze({ status: "succeeded" } as const));
    const externalNavigation: ExternalShortcutNavigationPort = { openNewTab };
    const runtime = createHeadlessRuntime({ externalNavigation });
    const publicConstructor: typeof ResourceOpenOperations = ResourceOpenOperations;

    const result: ResourceOpenResult = await runtime.resourceOpen.execute(action);

    expect(publicConstructor).toBeTypeOf("function");
    expect(FeatureResourceOpenOperations).toBe(ResourceOpenOperations);
    expect(result).toMatchObject({
      status: "succeeded",
      kind: "external-navigation-succeeded",
      action,
    });
    expect(openNewTab).toHaveBeenCalledExactlyOnceWith(action);
  });

  it("adapter가 없는 runtime은 ExternalShortcut 요청을 명시적 실패로 보존한다", async () => {
    const runtime = createHeadlessRuntime();

    await expect(runtime.resourceOpen.execute(action)).resolves.toMatchObject({
      status: "failed",
      kind: "external-navigation-failed",
      result: { reason: "adapter-not-configured" },
    });
  });
});
