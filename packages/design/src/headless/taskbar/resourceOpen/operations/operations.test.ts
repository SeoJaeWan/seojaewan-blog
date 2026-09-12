import { describe, expect, it, vi } from "vitest";

import { createResourceRef } from "../../../resources/index.js";
import type { OperationRuntimeFailure, TransitionResult } from "../../../runtime/index.js";
import type {
  WindowOperationHandle,
  WindowSettledResult,
  WindowState,
  WindowStoreResult,
} from "../../../windows/index.js";
import type { TaskbarExternalShortcutIntent } from "../../actions/index.js";
import {
  ResourceOpenOperations,
  type ResourceOpenWindowAction,
  type ResourceOpenWindowOperationPort,
} from "./index.js";

const state = Object.freeze({}) as WindowState;
const content = createResourceRef("content", "10000000-0000-4000-8000-000000000001");
const folder = createResourceRef("folder", "10000000-0000-4000-8000-000000000002");
const external = Object.freeze({
  type: "open-external-shortcut",
  url: "https://example.com/resource",
  target: "_blank",
}) satisfies TaskbarExternalShortcutIntent;

const settledWindowResult = (
  storeResult: WindowStoreResult,
  presentation: WindowSettledResult["presentation"] = Object.freeze({ status: "not-required" }),
): WindowSettledResult => Object.freeze({ status: "settled", storeResult, presentation });

const windowPort = (
  result: WindowSettledResult | OperationRuntimeFailure,
): ResourceOpenWindowOperationPort => ({
  execute: vi.fn(
    () =>
      ({
        settled: Promise.resolve(result),
      }) as WindowOperationHandle,
  ),
});

describe("ResourceOpenOperations", () => {
  it.each([
    {
      name: "commit",
      action: { type: "open-content", content } as const,
      storeResult: {
        ok: true,
        changed: true,
        change: { kind: "window-created" },
        value: state,
      } as WindowStoreResult,
      kind: "window-committed",
    },
    {
      name: "대상을 이미 충족한 no-op",
      action: { type: "open-folder", folder } as const,
      storeResult: { ok: true, changed: false, reason: "no-op", value: state } as WindowStoreResult,
      kind: "window-target-satisfied",
    },
  ])("Window $name 결과를 open 성공으로 분류한다", async ({ action, storeResult, kind }) => {
    const windows = windowPort(settledWindowResult(storeResult));
    const externalNavigation = { openNewTab: vi.fn() };
    const operations = new ResourceOpenOperations({ windows, externalNavigation });

    await expect(operations.execute(action)).resolves.toMatchObject({ status: "succeeded", kind });
    expect(windows.execute).toHaveBeenCalledExactlyOnceWith(action);
    expect(externalNavigation.openNewTab).not.toHaveBeenCalled();
  });

  it("Window Store 거절을 presentation 없는 open 실패로 분류한다", async () => {
    const rejected = settledWindowResult({
      ok: false,
      changed: false,
      reason: "folder-not-found",
    });
    const windows = windowPort(rejected);
    const operations = new ResourceOpenOperations({
      windows,
      externalNavigation: { openNewTab: vi.fn() },
    });

    await expect(operations.execute({ type: "open-folder", folder })).resolves.toMatchObject({
      status: "failed",
      kind: "window-rejected",
      result: rejected,
    });
  });

  it("Window executor throw의 runtime failure를 open 실패로 분류한다", async () => {
    const error = new Error("window open failed");
    const failure = Object.freeze({ status: "failed", source: "execution", error } as const);
    const operations = new ResourceOpenOperations({
      windows: windowPort(failure),
      externalNavigation: { openNewTab: vi.fn() },
    });

    await expect(operations.execute({ type: "open-content", content })).resolves.toMatchObject({
      status: "failed",
      kind: "window-operation-failed",
      result: failure,
    });
  });

  it("Window presentation 실패를 semantic commit과 구분한다", async () => {
    const error = new Error("window enter failed");
    const presentation = Object.freeze({
      status: "failed",
      operationId: "resource-open-test" as TransitionResult["operationId"],
      phase: "window-enter",
      error,
    } as const);
    const result = settledWindowResult(
      {
        ok: true,
        changed: true,
        change: { kind: "window-created" },
        value: state,
      },
      presentation,
    );
    const operations = new ResourceOpenOperations({
      windows: windowPort(result),
      externalNavigation: { openNewTab: vi.fn() },
    });

    await expect(operations.execute({ type: "open-content", content })).resolves.toMatchObject({
      status: "failed",
      kind: "window-presentation-failed",
      result,
    });
  });

  it("ExternalShortcut 성공은 navigation port를 한 번 호출하고 Window Operation을 건드리지 않는다", async () => {
    const windows = { execute: vi.fn() } as ResourceOpenWindowOperationPort;
    const navigationResult = Object.freeze({ status: "succeeded" } as const);
    const externalNavigation = { openNewTab: vi.fn(() => navigationResult) };
    const operations = new ResourceOpenOperations({ windows, externalNavigation });

    await expect(operations.execute(external)).resolves.toEqual({
      status: "succeeded",
      kind: "external-navigation-succeeded",
      action: external,
      result: navigationResult,
    });
    expect(externalNavigation.openNewTab).toHaveBeenCalledExactlyOnceWith(external);
    expect(windows.execute).not.toHaveBeenCalled();
  });

  it("ExternalShortcut의 명시적 실패는 panel에 전달할 open 실패로 보존한다", async () => {
    const windows = { execute: vi.fn() } as ResourceOpenWindowOperationPort;
    const navigationResult = Object.freeze({ status: "failed", reason: "popup-blocked" } as const);
    const operations = new ResourceOpenOperations({
      windows,
      externalNavigation: { openNewTab: vi.fn(() => navigationResult) },
    });

    await expect(operations.execute(external)).resolves.toMatchObject({
      status: "failed",
      kind: "external-navigation-failed",
      result: navigationResult,
    });
    expect(windows.execute).not.toHaveBeenCalled();
  });

  it("ExternalShortcut navigation throw를 실패로 정규화하고 WindowSession 경계를 호출하지 않는다", async () => {
    const windows = { execute: vi.fn() } as ResourceOpenWindowOperationPort;
    const error = new Error("browser adapter unavailable");
    const operations = new ResourceOpenOperations({
      windows,
      externalNavigation: {
        openNewTab: vi.fn(() => {
          throw error;
        }),
      },
    });

    await expect(operations.execute(external)).resolves.toMatchObject({
      status: "failed",
      kind: "external-navigation-threw",
      result: error,
    });
    expect(windows.execute).not.toHaveBeenCalled();
  });

  it("Window port의 동기 throw도 실패로 정규화한다", async () => {
    const error = new Error("window port unavailable");
    const action: ResourceOpenWindowAction = { type: "open-content", content };
    const operations = new ResourceOpenOperations({
      windows: {
        execute: vi.fn(() => {
          throw error;
        }),
      },
      externalNavigation: { openNewTab: vi.fn() },
    });

    await expect(operations.execute(action)).resolves.toMatchObject({
      status: "failed",
      kind: "window-operation-failed",
      result: error,
    });
  });
});
