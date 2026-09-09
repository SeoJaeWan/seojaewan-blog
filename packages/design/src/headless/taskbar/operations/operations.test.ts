import { describe, expect, it, vi } from "vitest";

import { createResourceRef } from "../../resources/index.js";
import { TransitionRegistry } from "../../runtime/index.js";
import type { WindowState } from "../../windows/index.js";
import type { TaskbarItem, TaskbarSnapshot } from "../model/index.js";
import type { TaskbarStoreCommandContext } from "../taskbarStore/index.js";
import { TaskbarOperations, type TaskbarOperationStore } from "./index.js";

const chrome: TaskbarItem = { kind: "application", applicationId: "chrome" };
const shortcut: TaskbarItem = {
  kind: "external-shortcut",
  resource: createResourceRef("external-shortcut", "30000000-0000-4000-8000-000000000001"),
};

/** 주어진 앱이 실행 중인 최소 Window snapshot을 만든다. */
const runningChrome = (): WindowState => ({
  mode: "desktop",
  workArea: { x: 0, y: 0, width: 1000, height: 800 },
  sessions: [
    {
      id: "30000000-0000-4000-8000-000000000002" as never,
      kind: "chrome",
      applicationId: "chrome",
      frame: {
        normalBounds: { x: 0, y: 0, width: 600, height: 400 },
        placement: "normal",
        minimized: false,
      },
      tabs: [
        {
          id: "30000000-0000-4000-8000-000000000003" as never,
          navigation: {
            current: { location: { kind: "new-tab" }, scrollTop: 0 },
            backStack: [],
            forwardStack: [],
          },
          reloadRevision: 0,
        },
      ],
      activeTabId: "30000000-0000-4000-8000-000000000003" as never,
    },
  ],
  stackingOrder: ["30000000-0000-4000-8000-000000000002" as never],
  activeSessionId: "30000000-0000-4000-8000-000000000002" as never,
});

/** Operation executor 시작을 한 microtask 진행한다. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("TaskbarOperations", () => {
  it("실행 중 application Pin은 항목 enter 없이 commit과 저장만 완료한다", async () => {
    const value: TaskbarSnapshot = { pinnedItems: [chrome], visibleItems: [chrome] };
    const pin = vi.fn((_item, context?: TaskbarStoreCommandContext) => {
      context?.onCommit(value);
      return Promise.resolve({ ok: true, value } as const);
    });
    const store = {
      getSnapshot: () => ({ pinnedItems: [], visibleItems: [chrome] }),
      isPinned: () => false,
      pin,
    } as unknown as TaskbarOperationStore;
    const operations = new TaskbarOperations({
      store,
      windowReader: { getSnapshot: runningChrome },
    });
    const handle = operations.execute({ type: "pin", item: chrome });

    await expect(handle.presented).resolves.toEqual({ status: "not-required" });
    await expect(handle.settled).resolves.toMatchObject({ status: "settled" });
  });

  it("사라지는 ExternalShortcut은 exit 뒤에 Store commit을 실행한다", async () => {
    const initial: TaskbarSnapshot = { pinnedItems: [shortcut], visibleItems: [shortcut] };
    const value: TaskbarSnapshot = { pinnedItems: [], visibleItems: [] };
    const unpin = vi.fn((_item, context?: TaskbarStoreCommandContext) => {
      context?.onCommit(value);
      return Promise.resolve({ ok: true, value } as const);
    });
    const store = {
      getSnapshot: () => initial,
      isPinned: () => true,
      unpin,
    } as unknown as TaskbarOperationStore;
    const transitions = new TransitionRegistry();
    const operations = new TaskbarOperations({
      store,
      transitions,
      windowReader: { getSnapshot: runningChrome },
    });
    const handle = operations.execute({ type: "unpin", item: shortcut });
    await flush();
    expect(unpin).not.toHaveBeenCalled();
    transitions.complete(handle.operationId, "taskbar-item-exit");
    await expect(handle.committed).resolves.toMatchObject({ status: "committed" });
    expect(unpin).toHaveBeenCalledTimes(1);
  });

  it("reorder는 이전 측정, commit, 새 측정과 이동 transition을 순서대로 완료한다", async () => {
    const initial: TaskbarSnapshot = {
      pinnedItems: [chrome, shortcut],
      visibleItems: [chrome, shortcut],
    };
    const value: TaskbarSnapshot = {
      pinnedItems: [shortcut, chrome],
      visibleItems: [shortcut, chrome],
    };
    const reorder = vi.fn((_item, _intent, context?: TaskbarStoreCommandContext) => {
      context?.onCommit(value);
      return Promise.resolve({ ok: true, value } as const);
    });
    const store = {
      getSnapshot: () => initial,
      isPinned: () => true,
      reorder,
    } as unknown as TaskbarOperationStore;
    const transitions = new TransitionRegistry();
    const operations = new TaskbarOperations({
      store,
      transitions,
      windowReader: { getSnapshot: runningChrome },
    });
    const handle = operations.execute({ type: "reorder", item: shortcut, intent: "first" });
    await flush();
    expect(reorder).not.toHaveBeenCalled();
    expect(transitions.complete(handle.operationId, "taskbar-reorder-measure-before")).toBe(true);
    await expect(handle.committed).resolves.toMatchObject({ status: "committed" });
    expect(transitions.complete(handle.operationId, "taskbar-reorder-measure-after")).toBe(true);
    await flush();
    expect(transitions.complete(handle.operationId, "taskbar-reorder-move")).toBe(true);
    await expect(handle.presented).resolves.toMatchObject({
      status: "sequence-completed",
      results: [
        { phase: "taskbar-reorder-measure-before" },
        { phase: "taskbar-reorder-measure-after" },
        { phase: "taskbar-reorder-move" },
      ],
    });
  });

  it("저장 실패로 settled된 뒤에도 다음 목록 요청을 실행한다", async () => {
    const committed: TaskbarSnapshot = { pinnedItems: [chrome], visibleItems: [chrome] };
    let calls = 0;
    const pin = vi.fn((_item, context?: TaskbarStoreCommandContext) => {
      calls += 1;
      context?.onCommit(committed);
      return Promise.resolve(
        calls === 1
          ? ({
              ok: false,
              reason: "storage-write-failed",
              committed: true,
              value: committed,
            } as const)
          : ({ ok: true, value: committed } as const),
      );
    });
    const store = {
      getSnapshot: () => ({ pinnedItems: [], visibleItems: [chrome] }),
      isPinned: () => false,
      pin,
    } as unknown as TaskbarOperationStore;
    const operations = new TaskbarOperations({
      store,
      windowReader: { getSnapshot: runningChrome },
    });
    const failed = operations.execute({ type: "pin", item: chrome });
    const following = operations.execute({ type: "pin", item: chrome });

    await expect(failed.settled).resolves.toMatchObject({
      storeResult: { reason: "storage-write-failed", committed: true },
    });
    await expect(following.settled).resolves.toMatchObject({ storeResult: { ok: true } });
    expect(pin).toHaveBeenCalledTimes(2);
  });
});
