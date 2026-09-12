import { createElement } from "react";

import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  createHeadlessRuntime,
  createResourceRef,
  createStaticCatalog,
  type HeadlessRuntime,
  type HeadlessRuntimeAdapters,
  HeadlessRuntimeProvider,
  type PrimaryPanelOperationHandle,
  type ResourceOpenResult,
  type ResourceReaders,
  type ResourceRef,
  type StartSnapshot,
  type StartStoreCommandContext,
  type StartStoreResult,
  type WindowState,
} from "../../../../../headless/index.js";
import { type TaskbarPanelsConnection, useTaskbarPanelsConnection } from "./index.js";

const desktopSnapshot = Object.freeze({
  mode: "desktop",
  workArea: Object.freeze({ x: 0, y: 0, width: 1280, height: 720 }),
  sessions: Object.freeze([]),
  stackingOrder: Object.freeze([]),
  activeSessionId: null,
}) satisfies WindowState;

const folder = createResourceRef("folder", "10000000-0000-4000-8000-000000000001");
const content = createResourceRef("content", "10000000-0000-4000-8000-000000000002");
const shortcut = createResourceRef("external-shortcut", "10000000-0000-4000-8000-000000000003");
const resources = Object.freeze({
  folder: createStaticCatalog([{ ref: folder, name: "프로젝트" }]),
  content: createStaticCatalog([
    {
      ref: content,
      title: "Alpha 문서",
      slug: "alpha",
      summary: "fixture",
      date: "2026-09-10",
      tags: [],
      cover: null,
      source: { kind: "notion" as const, pageId: "alpha" },
    },
  ]),
  externalShortcut: createStaticCatalog([
    { ref: shortcut, name: "7zip", url: "https://example.com/7zip" },
  ]),
}) satisfies ResourceReaders;

/** Pin commit과 구독을 실제 Start Operation이 관찰할 수 있는 deterministic adapter다. */
const createStartAdapter = (initial: readonly ResourceRef[]) => {
  let snapshot = Object.freeze({
    pinnedItems: Object.freeze(initial.map((resource) => Object.freeze({ resource }))),
  }) satisfies StartSnapshot;
  const listeners = new Set<() => void>();
  const commit = (
    pinnedItems: StartSnapshot["pinnedItems"],
    context?: StartStoreCommandContext,
  ): Promise<StartStoreResult> => {
    snapshot = Object.freeze({ pinnedItems: Object.freeze([...pinnedItems]) });
    context?.onCommit(snapshot);
    for (const listener of listeners) listener();
    return Promise.resolve(Object.freeze({ ok: true, value: snapshot }));
  };
  return Object.freeze({
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    isPinned: (resource: ResourceRef) =>
      snapshot.pinnedItems.some(
        (item) => item.resource.kind === resource.kind && item.resource.id === resource.id,
      ),
    pin: (resource: ResourceRef, context?: StartStoreCommandContext) =>
      commit([...snapshot.pinnedItems, { resource }], context),
    unpin: (resource: ResourceRef, context?: StartStoreCommandContext) =>
      commit(
        snapshot.pinnedItems.filter(
          (item) => item.resource.kind !== resource.kind || item.resource.id !== resource.id,
        ),
        context,
      ),
    reorder: (
      resource: ResourceRef,
      intent: "first" | "left" | "right" | Readonly<{ type: "index"; index: number }>,
      context?: StartStoreCommandContext,
    ) => {
      const items = [...snapshot.pinnedItems];
      const index = items.findIndex(
        (item) => item.resource.kind === resource.kind && item.resource.id === resource.id,
      );
      const [item] = items.splice(index, 1);
      const target =
        typeof intent === "object"
          ? intent.index
          : intent === "first"
            ? 0
            : intent === "left"
              ? index - 1
              : index + 1;
      if (item !== undefined) items.splice(Math.max(0, Math.min(items.length, target)), 0, item);
      return commit(items, context);
    },
  }) as NonNullable<HeadlessRuntimeAdapters["start"]>;
};

/** 실제 primary panel runtime을 desktop mode와 조합한다. */
const createRuntime = () => {
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  return createHeadlessRuntime({ adapters: { windows } });
};

/** 최신 hook 결과를 실제 Provider 아래에서 관찰한다. */
const renderConnection = (
  runtime: HeadlessRuntime = createRuntime(),
  resourceReaders?: ResourceReaders,
) => {
  let current: TaskbarPanelsConnection | undefined;
  const Probe = () => {
    current = useTaskbarPanelsConnection({ resources: resourceReaders });
    return null;
  };
  const mounted = render(createElement(HeadlessRuntimeProvider, { runtime }, createElement(Probe)));
  return {
    ...mounted,
    get current(): TaskbarPanelsConnection {
      return current!;
    },
  };
};

/** 실제 Start channels 위에 결과를 제어할 Resource adapter만 교체한다. */
const createProductRuntime = (execute: (resource: ResourceRef) => Promise<ResourceOpenResult>) => {
  const windows = {
    getSnapshot: () => desktopSnapshot,
    subscribe: () => () => undefined,
  } as unknown as NonNullable<HeadlessRuntimeAdapters["windows"]>;
  const start = createStartAdapter([folder, content, shortcut]);
  const base = createHeadlessRuntime({ adapters: { start, windows } });
  return Object.freeze({
    ...base,
    resourceOpen: Object.freeze({
      execute: (action: Parameters<HeadlessRuntime["resourceOpen"]["execute"]>[0]) => {
        const resource =
          action.type === "open-folder"
            ? action.folder
            : action.type === "open-content"
              ? action.content
              : shortcut;
        return execute(resource);
      },
    }),
  }) satisfies HeadlessRuntime;
};

/** Operation을 시작하고 첫 semantic commit까지 React 구독을 반영한다. */
const startCommitted = async (
  execute: () => PrimaryPanelOperationHandle,
): Promise<PrimaryPanelOperationHandle> => {
  let handle: PrimaryPanelOperationHandle | undefined;
  await act(async () => {
    handle = execute();
    await handle.committed;
  });
  return handle!;
};

afterEach(() => cleanup());

describe("useTaskbarPanelsConnection", () => {
  it("같은 operation ID로 이전 exit를 끝낸 뒤 다음 panel enter를 시작한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    expect(mounted.current.start.widget.open).toBe(true);

    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
    });

    const switching = mounted.current.search.actions.trigger();
    await act(async () => Promise.resolve());
    expect(mounted.current.start.widget.open).toBe(false);
    expect(mounted.current.search.widget.open).toBe(false);

    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(false);
      await Promise.resolve();
    });
    expect(mounted.current.search.widget.open).toBe(true);

    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await switching.settled;
    });
    expect(await switching.presented).toMatchObject({
      status: "sequence-completed",
      results: [
        { status: "completed", operationId: switching.operationId },
        { status: "completed", operationId: switching.operationId },
      ],
    });
  });

  it("widget dismiss 완료 전 query를 보존하고 실제 exit 완료 뒤에만 초기화한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.search.actions.trigger());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await opening.settled;
      await mounted.current.search.actions.updateQuery("한글  query ").settled;
    });
    expect(mounted.current.search.query).toBe("한글  query ");

    await act(async () => {
      mounted.current.search.widget.onOpenChange(false, "outside");
      await Promise.resolve();
    });
    expect(mounted.current.search.widget.open).toBe(false);
    expect(mounted.current.search.query).toBe("한글  query ");

    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(false);
      await Promise.resolve();
    });
    expect(mounted.current.search.query).toBe("");
  });

  it("Resource 실패와 오래된 성공은 보존하고 현재 성공만 close 완료에 연결한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.search.actions.trigger());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await opening.settled;
      await mounted.current.search.actions.updateQuery("보존할 검색").settled;
      await mounted.current.search.resource.track("request-failed").settled;
      await mounted.current.search.resource.settle("request-failed", "failed").settled;
    });
    expect(mounted.current.search.widget.open).toBe(true);
    expect(mounted.current.search.query).toBe("보존할 검색");

    await act(async () => {
      await mounted.current.search.resource.track("request-stale").settled;
    });
    const closing = mounted.current.search.actions.dismiss("escape");
    await act(async () => Promise.resolve());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(false);
      await closing.settled;
    });
    const reopened = await startCommitted(() => mounted.current.search.actions.trigger());
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await reopened.settled;
      await mounted.current.search.actions.updateQuery("새 activation").settled;
    });

    const stale = mounted.current.search.resource.settle("request-stale", "succeeded");
    await act(async () => {
      expect(await stale.committed).toMatchObject({
        status: "no-op",
        reason: "stale-resource-open",
      });
      await stale.settled;
    });
    expect(mounted.current.search.widget.open).toBe(true);
    expect(mounted.current.search.query).toBe("새 activation");

    await act(async () => {
      await mounted.current.search.resource.track("request-current").settled;
    });
    const succeeded = mounted.current.search.resource.settle("request-current", "succeeded");
    await act(async () => Promise.resolve());
    expect(mounted.current.search.widget.open).toBe(false);
    expect(mounted.current.search.query).toBe("새 activation");
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(false);
      await succeeded.settled;
    });
    expect(mounted.current.search.query).toBe("");
  });

  it("Start 제품 identity와 open 실패·성공을 같은 runtime lifecycle에 연결한다", async () => {
    const execute = vi.fn<(resource: ResourceRef) => Promise<ResourceOpenResult>>();
    execute.mockResolvedValueOnce({
      status: "failed",
      kind: "external-navigation-failed",
    } as never);
    execute.mockResolvedValueOnce({
      status: "succeeded",
      kind: "external-navigation-succeeded",
    } as never);
    const runtime = createProductRuntime(execute);
    const mounted = renderConnection(runtime, resources);
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
      mounted.current.start.screen.actions.execute({ type: "set-view", view: "all" });
      mounted.current.start.screen.actions.execute({ type: "set-index-open", open: true });
    });

    expect(mounted.current.start.ready).toBe(true);
    expect(mounted.current.start.pins.items.map((item) => item.label)).toEqual([
      "프로젝트",
      "Alpha 문서",
      "7zip",
    ]);
    expect(mounted.current.start.all.groups.map((group) => group.key)).toEqual(["A", "7"]);

    await act(async () => {
      await mounted.current.start.resource.open(shortcut);
    });
    expect(mounted.current.start.widget.open).toBe(true);
    expect(mounted.current.start.screen.snapshot).toEqual({ view: "all", indexOpen: true });
    expect(runtime.start.getSnapshot().snapshot?.pinnedItems).toHaveLength(3);

    await act(async () => {
      await mounted.current.start.resource.open(shortcut);
    });
    expect(mounted.current.start.widget.open).toBe(false);
    expect(mounted.current.start.screen.snapshot).toEqual({ view: "all", indexOpen: true });
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(false);
      await Promise.resolve();
    });
    expect(mounted.current.start.screen.snapshot).toEqual({ view: "pinned", indexOpen: false });
    expect(runtime.start.getSnapshot().snapshot?.pinnedItems).toHaveLength(3);
  });

  it("늦은 Start open 성공이 새 activation과 browse state를 닫거나 초기화하지 않는다", async () => {
    let resolveOpen!: (result: ResourceOpenResult) => void;
    const runtime = createProductRuntime(
      () =>
        new Promise<ResourceOpenResult>((resolve) => {
          resolveOpen = resolve;
        }),
    );
    const mounted = renderConnection(runtime, resources);
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
      mounted.current.start.screen.actions.execute({ type: "set-view", view: "all" });
      mounted.current.start.screen.actions.execute({ type: "set-index-open", open: true });
    });

    const pendingOpen = mounted.current.start.resource.open(content);
    await act(async () => Promise.resolve());
    const closing = mounted.current.start.actions.dismiss("escape");
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(false);
      await closing.settled;
    });
    const reopening = await startCommitted(() => mounted.current.start.actions.trigger());
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await reopening.settled;
      mounted.current.start.screen.actions.execute({ type: "set-view", view: "all" });
      mounted.current.start.screen.actions.execute({ type: "set-index-open", open: true });
      resolveOpen({ status: "succeeded", kind: "window-target-satisfied" } as never);
      await pendingOpen;
    });

    expect(mounted.current.start.widget.open).toBe(true);
    expect(mounted.current.start.screen.snapshot).toEqual({ view: "all", indexOpen: true });
    expect(runtime.start.getSnapshot().snapshot?.pinnedItems).toHaveLength(3);
  });

  it("mobile 전환은 진행 중 switch의 늦은 desktop open을 무효화한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
      mounted.current.start.screen.actions.execute({ type: "set-view", view: "all" });
      mounted.current.start.screen.actions.execute({ type: "set-index-open", open: true });
    });
    expect(mounted.current.start.screen.snapshot).toEqual({ view: "all", indexOpen: true });

    const switching = mounted.current.search.actions.trigger();
    await act(async () => Promise.resolve());
    const mobile = mounted.current.dismissForMobile();
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(false);
      await switching.settled;
      await mobile.settled;
    });

    expect(mounted.current.start.widget.open).toBe(false);
    expect(mounted.current.search.widget.open).toBe(false);
    expect(mounted.current.start.screen.snapshot).toEqual({ view: "pinned", indexOpen: false });
    expect(await switching.committed).toMatchObject({
      status: "committed",
      snapshot: { activePanel: null },
    });
  });

  it("mount 전에 시작한 Handle을 replay해 exact 완료와 settled 뒤 재연결을 처리한다", async () => {
    const runtime = createRuntime();
    const opening = runtime.primaryPanel.execute({ type: "trigger", panel: "search" });
    await opening.committed;
    const mounted = renderConnection(runtime);
    await act(async () => {
      mounted.current.search.widget.onTransitionComplete?.(true);
      await opening.settled;
    });
    expect(await opening.presented).toMatchObject({
      status: "completed",
      operationId: opening.operationId,
    });
    mounted.unmount();
    const remounted = renderConnection(runtime);
    act(() => {
      remounted.current.search.widget.onTransitionComplete?.(true);
    });
    expect(runtime.transitions.complete(opening.operationId, "primary-panel-enter")).toBe(false);
  });

  it.each(["start", "search"] as const)(
    "내부 %s close 중 unmount는 exact exit를 중단하고 transient를 정리한다",
    async (panel) => {
      const runtime = createRuntime();
      const mounted = renderConnection(runtime);
      const opening = await startCommitted(() => mounted.current[panel].actions.trigger());
      await act(async () => {
        mounted.current[panel].widget.onTransitionComplete?.(true);
        await opening.settled;
        await mounted.current[panel].actions.updateQuery("보존 중").settled;
        await runtime.primaryPanel.execute({
          type: "track-resource-open",
          panel,
          requestId: "internal",
        }).settled;
      });
      const close = runtime.primaryPanel.execute({
        type: "settle-resource-open",
        requestId: "internal",
        outcome: "succeeded",
      });
      await act(async () => Promise.resolve());
      act(() => mounted.unmount());
      await expect(close.presented).resolves.toMatchObject({
        status: "aborted",
        operationId: close.operationId,
        reason: "taskbar-panels-connection-unmounted",
      });
      await close.settled;
      const snapshot = runtime.primaryPanel.getSnapshot().snapshot;
      expect(snapshot?.[panel === "start" ? "startQuery" : "searchQuery"]).toBe("");
      expect(runtime.transitions.complete(close.operationId, "primary-panel-exit")).toBe(false);
    },
  );

  it("connection unmount는 대기 중 exact phase를 중단하고 늦은 completion을 남기지 않는다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());

    act(() => mounted.unmount());
    expect(await opening.presented).toMatchObject({
      status: "aborted",
      operationId: opening.operationId,
      reason: "taskbar-panels-connection-unmounted",
    });
    await opening.settled;
  });

  it("switch 중 unmount는 같은 operation의 exit와 뒤이어 생긴 enter waiter를 모두 정리한다", async () => {
    const mounted = renderConnection();
    const opening = await startCommitted(() => mounted.current.start.actions.trigger());
    await act(async () => {
      mounted.current.start.widget.onTransitionComplete?.(true);
      await opening.settled;
    });

    const switching = mounted.current.search.actions.trigger();
    await act(async () => Promise.resolve());
    act(() => mounted.unmount());

    expect(await switching.presented).toMatchObject({
      status: "sequence-completed",
      results: [
        { status: "aborted", reason: "taskbar-panels-connection-unmounted" },
        { status: "aborted", reason: "taskbar-panels-connection-unmounted" },
      ],
    });
    await switching.settled;
  });
});
