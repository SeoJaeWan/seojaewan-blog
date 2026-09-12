import { describe, expect, it, vi } from "vitest";

import { TransitionRegistry } from "../../runtime/index.js";
import type { ChromeWindowSession, WindowState } from "../model/index.js";
import { type WindowSessionId } from "../windowSessionId/index.js";
import type { WindowStoreCommandContext } from "../windowStore/index.js";
import type {
  WindowStoreCommittedResult,
  WindowStoreResult,
} from "../windowStore/operationResult/index.js";
import { type WindowAction, WindowOperations, type WindowOperationStore } from "./index.js";

/** 테스트용 UUID를 WindowSessionId로 표시한다. */
const sessionId = (suffix: string) => `10000000-0000-4000-8000-${suffix}` as WindowSessionId;

/** 최소 Chrome Session fixture를 만든다. */
const session = (id: WindowSessionId): ChromeWindowSession => ({
  id,
  kind: "chrome",
  applicationId: "chrome",
  frame: {
    normalBounds: { x: 0, y: 0, width: 600, height: 400 },
    placement: "normal",
    minimized: false,
  },
  tabs: [
    {
      id: `${id.slice(0, -1)}1` as ChromeWindowSession["activeTabId"],
      navigation: {
        current: { location: { kind: "new-tab" }, scrollTop: 0 },
        backStack: [],
        forwardStack: [],
      },
      reloadRevision: 0,
    },
  ],
  activeTabId: `${id.slice(0, -1)}1` as ChromeWindowSession["activeTabId"],
});

/** Session 목록에서 일관된 desktop snapshot을 만든다. */
const snapshot = (sessions: readonly ChromeWindowSession[]): WindowState => ({
  mode: "desktop",
  workArea: { x: 0, y: 0, width: 1000, height: 800 },
  sessions,
  stackingOrder: sessions.map(({ id }) => id),
  activeSessionId: sessions.at(-1)?.id ?? null,
});

/** commit result를 만들고 command context를 일반 subscriber보다 먼저 호출한다. */
const commit = (
  value: WindowState,
  change: WindowStoreCommittedResult["change"],
  context?: WindowStoreCommandContext,
): WindowStoreCommittedResult => {
  const result = { ok: true, changed: true, change, value } as WindowStoreCommittedResult;
  context?.onCommit(result);
  return result;
};

/** Operation executor가 시작할 microtask를 진행시킨다. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("WindowOperations", () => {
  it("Explorer runtime Action을 같은 Session queue의 정확한 Store 명령으로 전달한다", async () => {
    const id = sessionId("000000000011");
    const current = snapshot([session(id)]);
    const tabId = "10000000-0000-4000-8000-000000000012" as never;
    const folderId = "20000000-0000-4000-8000-000000000001" as never;
    const folder = { kind: "folder" as const, id: folderId };
    const content = {
      kind: "content" as const,
      id: "30000000-0000-4000-8000-000000000001" as never,
    };
    const cases: readonly Readonly<{
      action: WindowAction;
      method: keyof WindowOperationStore;
      args: readonly unknown[];
    }>[] = [
      {
        action: {
          type: "navigate-file-explorer",
          sessionId: id,
          tabId,
          target: { kind: "unresolved-path", path: "/missing" },
        },
        method: "navigateFileExplorer",
        args: [id, tabId, { kind: "unresolved-path", path: "/missing" }],
      },
      {
        action: { type: "set-file-explorer-query", sessionId: id, tabId, query: "react" },
        method: "setFileExplorerQuery",
        args: [id, tabId, "react"],
      },
      {
        action: {
          type: "set-file-explorer-expanded-folder-ids",
          sessionId: id,
          tabId,
          expandedFolderIds: [folderId],
        },
        method: "setFileExplorerExpandedFolderIds",
        args: [id, tabId, [folderId]],
      },
      {
        action: {
          type: "set-file-explorer-selection",
          sessionId: id,
          tabId,
          selection: [content],
        },
        method: "setFileExplorerSelection",
        args: [id, tabId, [content]],
      },
      {
        action: { type: "set-file-explorer-sidebar-width", sessionId: id, sidebarWidth: 288 },
        method: "setFileExplorerSidebarWidth",
        args: [id, 288],
      },
      {
        action: {
          type: "refresh-file-explorer",
          sessionId: id,
          tabId,
          resolvedLocation: folder,
        },
        method: "refreshFileExplorer",
        args: [id, tabId, folder],
      },
    ];

    for (const entry of cases) {
      const call = vi.fn((): Promise<WindowStoreResult> =>
        Promise.resolve({ ok: true, changed: false, reason: "no-op", value: current }),
      );
      const store = {
        getSnapshot: () => current,
        [entry.method]: call,
      } as unknown as WindowOperationStore;
      const operations = new WindowOperations({ store });
      await operations.execute(entry.action).settled;
      expect(call).toHaveBeenCalledTimes(1);
      expect(call.mock.calls[0]?.slice(0, -1)).toEqual(entry.args);
      const context = call.mock.calls[0]?.at(-1) as WindowStoreCommandContext | undefined;
      expect(typeof context?.onCommit).toBe("function");
    }
  });

  it("생성 commit에서 Session queue를 subscriber 재진입보다 먼저 연결한다", async () => {
    const createdId = sessionId("000000000001");
    const transitions = new TransitionRegistry();
    let current = snapshot([]);
    const subscriberRef: { current?: () => void } = {};
    let reentrant: ReturnType<WindowOperations["execute"]> | undefined;
    const activate = vi.fn((): Promise<WindowStoreResult> =>
      Promise.resolve({
        ok: true,
        changed: false,
        reason: "no-op",
        value: current,
      }),
    );
    const store = {
      getSnapshot: () => current,
      createChromeWindow: (_location: unknown, context?: WindowStoreCommandContext) => {
        current = snapshot([session(createdId)]);
        const result = commit(current, { kind: "window-created", sessionId: createdId }, context);
        subscriberRef.current?.();
        return Promise.resolve(result);
      },
      activate,
    } as unknown as WindowOperationStore;
    const operations = new WindowOperations({ store, transitions });
    subscriberRef.current = () => {
      reentrant = operations.execute({ type: "activate", sessionId: createdId });
    };

    const creation = operations.execute({ type: "create-chrome-window" });
    await flush();
    await expect(creation.committed).resolves.toMatchObject({ status: "committed" });
    expect(reentrant).toBeDefined();
    expect(activate).not.toHaveBeenCalled();

    transitions.complete(creation.operationId, "window-enter");
    await expect(creation.settled).resolves.toMatchObject({ status: "settled" });
    await expect(reentrant!.settled).resolves.toMatchObject({ status: "settled" });
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("close가 settled된 뒤 같은 Session restore를 최신 상태에서 거절한다", async () => {
    const id = sessionId("000000000002");
    const transitions = new TransitionRegistry();
    let current = snapshot([session(id)]);
    const close = vi.fn((_id: WindowSessionId, context?: WindowStoreCommandContext) => {
      current = snapshot([]);
      return Promise.resolve(commit(current, { kind: "window-closed", sessionId: id }, context));
    });
    const activate = vi.fn((): Promise<WindowStoreResult> =>
      Promise.resolve({
        ok: false,
        changed: false,
        reason: "session-not-found",
      }),
    );
    const store = {
      getSnapshot: () => current,
      close,
      activate,
    } as unknown as WindowOperationStore;
    const operations = new WindowOperations({ store, transitions });

    const closing = operations.execute({ type: "close", sessionId: id });
    const restoring = operations.execute({ type: "activate", sessionId: id });
    await flush();
    expect(close).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
    transitions.complete(closing.operationId, "window-exit");

    await expect(closing.settled).resolves.toMatchObject({ status: "settled" });
    await expect(restoring.committed).resolves.toMatchObject({
      status: "rejected",
      result: { reason: "session-not-found" },
    });
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("서로 다른 Session transition은 독립적으로 commit한다", async () => {
    const first = sessionId("000000000003");
    const second = sessionId("000000000004");
    const transitions = new TransitionRegistry();
    let current = snapshot([session(first), session(second)]);
    const close = vi.fn((id: WindowSessionId, context?: WindowStoreCommandContext) => {
      current = snapshot(
        current.sessions.filter(({ id: currentId }) => currentId !== id) as ChromeWindowSession[],
      );
      return Promise.resolve(commit(current, { kind: "window-closed", sessionId: id }, context));
    });
    const store = { getSnapshot: () => current, close } as unknown as WindowOperationStore;
    const present = vi.fn();
    const operations = new WindowOperations({
      store,
      transitions,
      presentation: { present },
    });
    const firstHandle = operations.execute({ type: "close", sessionId: first });
    const secondHandle = operations.execute({ type: "close", sessionId: second });
    await flush();

    expect(present).toHaveBeenCalledTimes(2);
    transitions.complete(secondHandle.operationId, "window-exit");
    await expect(secondHandle.committed).resolves.toMatchObject({ status: "committed" });
    expect(close).toHaveBeenCalledTimes(1);
    transitions.complete(firstHandle.operationId, "window-exit");
    await expect(firstHandle.settled).resolves.toMatchObject({ status: "settled" });
    expect(close).toHaveBeenCalledTimes(2);
  });

  it("minimize는 transition 뒤 commit하고 restore는 commit 뒤 transition한다", async () => {
    const id = sessionId("000000000005");
    const transitions = new TransitionRegistry();
    let current = snapshot([session(id)]);
    const minimize = vi.fn((_id: WindowSessionId, context?: WindowStoreCommandContext) => {
      const currentSession = current.sessions[0] as ChromeWindowSession;
      current = snapshot([
        { ...currentSession, frame: { ...currentSession.frame, minimized: true } },
      ]);
      return Promise.resolve(commit(current, { kind: "window-minimized", sessionId: id }, context));
    });
    const activate = vi.fn((_id: WindowSessionId, context?: WindowStoreCommandContext) => {
      const currentSession = current.sessions[0] as ChromeWindowSession;
      current = snapshot([
        { ...currentSession, frame: { ...currentSession.frame, minimized: false } },
      ]);
      return Promise.resolve(commit(current, { kind: "window-activated", sessionId: id }, context));
    });
    const store = {
      getSnapshot: () => current,
      minimize,
      activate,
    } as unknown as WindowOperationStore;
    const operations = new WindowOperations({ store, transitions });
    const minimizing = operations.execute({ type: "minimize", sessionId: id });
    await flush();
    expect(minimize).not.toHaveBeenCalled();
    transitions.complete(minimizing.operationId, "window-minimize");
    await expect(minimizing.committed).resolves.toMatchObject({ status: "committed" });

    const restoring = operations.execute({ type: "activate", sessionId: id });
    await minimizing.settled;
    await expect(restoring.committed).resolves.toMatchObject({ status: "committed" });
    expect(activate).toHaveBeenCalledTimes(1);
    let settled = false;
    void restoring.settled.then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);
    transitions.complete(restoring.operationId, "window-restore");
    await expect(restoring.settled).resolves.toMatchObject({ status: "settled" });
  });

  it("같은 Session의 다음 presentation은 앞 Operation settled 뒤에 시작한다", async () => {
    const id = sessionId("000000000010");
    const transitions = new TransitionRegistry();
    let current = snapshot([session(id)]);
    const toggleMaximize = vi.fn((_id: WindowSessionId, context?: WindowStoreCommandContext) => {
      const currentSession = current.sessions[0] as ChromeWindowSession;
      const placement = currentSession.frame.placement === "normal" ? "maximized" : "normal";
      current = snapshot([{ ...currentSession, frame: { ...currentSession.frame, placement } }]);
      return Promise.resolve(
        commit(
          current,
          {
            kind: placement === "maximized" ? "window-maximized" : "window-restored",
            sessionId: id,
          },
          context,
        ),
      );
    });
    const present = vi.fn();
    const store = { getSnapshot: () => current, toggleMaximize } as unknown as WindowOperationStore;
    const operations = new WindowOperations({ store, transitions, presentation: { present } });

    const maximizing = operations.execute({ type: "toggle-maximize", sessionId: id });
    const restoring = operations.execute({ type: "toggle-maximize", sessionId: id });
    await maximizing.committed;
    await flush();
    expect(present).toHaveBeenCalledTimes(1);
    expect(toggleMaximize).toHaveBeenCalledTimes(1);

    transitions.complete(maximizing.operationId, "window-maximize");
    await maximizing.settled;
    await restoring.committed;
    expect(present).toHaveBeenCalledTimes(2);
    expect(toggleMaximize).toHaveBeenCalledTimes(2);
    transitions.complete(restoring.operationId, "window-restore-normal-bounds");
    await restoring.settled;
  });

  it("maximize와 해제는 normalBounds를 보존하며 각 commit 뒤 transition한다", async () => {
    const id = sessionId("000000000006");
    const transitions = new TransitionRegistry();
    let current = snapshot([session(id)]);
    const originalBounds = current.sessions[0].frame.normalBounds;
    const toggleMaximize = vi.fn((_id: WindowSessionId, context?: WindowStoreCommandContext) => {
      const currentSession = current.sessions[0] as ChromeWindowSession;
      const placement = currentSession.frame.placement === "normal" ? "maximized" : "normal";
      current = snapshot([{ ...currentSession, frame: { ...currentSession.frame, placement } }]);
      return Promise.resolve(
        commit(
          current,
          {
            kind: placement === "maximized" ? "window-maximized" : "window-restored",
            sessionId: id,
          },
          context,
        ),
      );
    });
    const store = { getSnapshot: () => current, toggleMaximize } as unknown as WindowOperationStore;
    const operations = new WindowOperations({ store, transitions });

    const maximizing = operations.execute({ type: "toggle-maximize", sessionId: id });
    await expect(maximizing.committed).resolves.toMatchObject({ status: "committed" });
    expect(current.sessions[0].frame).toMatchObject({
      placement: "maximized",
      normalBounds: originalBounds,
    });
    transitions.complete(maximizing.operationId, "window-maximize");
    await maximizing.settled;

    const restoring = operations.execute({ type: "toggle-maximize", sessionId: id });
    await expect(restoring.committed).resolves.toMatchObject({ status: "committed" });
    expect(current.sessions[0].frame).toMatchObject({
      placement: "normal",
      normalBounds: originalBounds,
    });
    transitions.complete(restoring.operationId, "window-restore-normal-bounds");
    await expect(restoring.settled).resolves.toMatchObject({ status: "settled" });
  });

  it("transition 대기를 먼저 등록하고 presentation port의 동기 완료를 보존한다", async () => {
    const id = sessionId("000000000007");
    const transitions = new TransitionRegistry();
    let current = snapshot([session(id)]);
    const toggleMaximize = vi.fn((_id: WindowSessionId, context?: WindowStoreCommandContext) => {
      const currentSession = current.sessions[0] as ChromeWindowSession;
      current = snapshot([
        { ...currentSession, frame: { ...currentSession.frame, placement: "maximized" } },
      ]);
      return Promise.resolve(commit(current, { kind: "window-maximized", sessionId: id }, context));
    });
    const present = vi.fn((request: { operationId: string; phase: string }) => {
      expect(transitions.complete(request.operationId as never, request.phase)).toBe(true);
    });
    const release = vi.fn();
    const store = { getSnapshot: () => current, toggleMaximize } as unknown as WindowOperationStore;
    const operations = new WindowOperations({
      store,
      transitions,
      presentation: { present, release },
    });

    const maximizing = operations.execute({ type: "toggle-maximize", sessionId: id });

    await expect(maximizing.presented).resolves.toMatchObject({
      status: "completed",
      phase: "window-maximize",
    });
    await expect(maximizing.settled).resolves.toMatchObject({ status: "settled" });
    expect(present).toHaveBeenCalledWith({
      operationId: maximizing.operationId,
      sessionId: id,
      phase: "window-maximize",
    });
    expect(release).toHaveBeenCalledExactlyOnceWith({
      operationId: maximizing.operationId,
      sessionId: id,
      phase: "window-maximize",
    });
  });

  it("presentation port Promise 거절을 failed로 정리하고 같은 Session의 다음 요청을 실행한다", async () => {
    const id = sessionId("000000000008");
    const transitions = new TransitionRegistry();
    let current = snapshot([session(id)]);
    const toggleMaximize = vi.fn((_id: WindowSessionId, context?: WindowStoreCommandContext) => {
      const currentSession = current.sessions[0] as ChromeWindowSession;
      current = snapshot([
        { ...currentSession, frame: { ...currentSession.frame, placement: "maximized" } },
      ]);
      return Promise.resolve(commit(current, { kind: "window-maximized", sessionId: id }, context));
    });
    const activate = vi.fn((): Promise<WindowStoreResult> =>
      Promise.resolve({ ok: true, changed: false, reason: "no-op", value: current }),
    );
    const store = {
      getSnapshot: () => current,
      toggleMaximize,
      activate,
    } as unknown as WindowOperationStore;
    const error = new Error("animation start failed");
    const operations = new WindowOperations({
      store,
      transitions,
      presentation: { present: () => Promise.reject(error) },
    });

    const maximizing = operations.execute({ type: "toggle-maximize", sessionId: id });
    const activating = operations.execute({ type: "activate", sessionId: id });

    await expect(maximizing.presented).resolves.toMatchObject({
      status: "failed",
      phase: "window-maximize",
      error,
    });
    await expect(maximizing.settled).resolves.toMatchObject({ status: "settled" });
    await expect(activating.settled).resolves.toMatchObject({ status: "settled" });
    expect(activate).toHaveBeenCalledTimes(1);
  });

  it("Store 거절에는 presentation을 요청하지 않는다", async () => {
    const id = sessionId("000000000009");
    const transitions = new TransitionRegistry();
    const current = snapshot([]);
    const close = vi.fn((): Promise<WindowStoreResult> =>
      Promise.resolve({ ok: false, changed: false, reason: "session-not-found" }),
    );
    const present = vi.fn();
    const store = { getSnapshot: () => current, close } as unknown as WindowOperationStore;
    const operations = new WindowOperations({ store, transitions, presentation: { present } });

    const closing = operations.execute({ type: "close", sessionId: id });

    await expect(closing.committed).resolves.toMatchObject({ status: "rejected" });
    await expect(closing.presented).resolves.toEqual({ status: "not-required" });
    expect(present).not.toHaveBeenCalled();
  });
});
