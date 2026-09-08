import { afterEach, describe, expect, it, vi } from "vitest";

import type {
  WindowAction,
  WindowCommittedResult,
  WindowOperationHandle,
  WindowOperationsOptions,
  WindowOperationStore,
  WindowPresentedResult,
  WindowSettledResult,
} from "../index.js";

/** 테스트용 UUID를 순서대로 반환하도록 browser crypto port를 준비한다. */
const stubIds = () => {
  let sequence = 0;
  vi.stubGlobal("crypto", {
    randomUUID: () =>
      `10000000-0000-4000-8000-${String((sequence += 1)).padStart(12, "0")}`,
  });
};

/** 실제 package root에서 새 Window runtime과 Content fixture를 준비한다. */
const setup = async () => {
  vi.resetModules();
  stubIds();
  const design = await import("../index.js");
  const content = design.createResourceRef(
    "content",
    "30000000-0000-4000-8000-000000000001",
  );
  const contentInbox = design.createResourceRef(
    "folder",
    "30000000-0000-4000-8000-000000000002",
  );
  const workspace = {
    getSnapshot: () => ({
      schemaVersion: 1 as const,
      contentInbox,
      folders: [{ ref: contentInbox, name: "Content" }],
      placements: [
        { resource: contentInbox, parent: null },
        { resource: content, parent: contentInbox },
      ],
    }),
  };
  const contentCatalog = {
    has: (id: string) => id === content.id,
    get: (id: string) =>
      id === content.id
        ? {
            ref: content,
            title: "Content",
            slug: "content",
            summary: "",
            date: "2026-09-08",
            tags: [],
            cover: null,
            source: { kind: "notion" as const, pageId: content.id },
          }
        : undefined,
    list: () => [],
  };
  await design.WindowStore.initialize({
    workspace,
    contentCatalog,
    placementConfig: {
      defaultSize: { width: 600, height: 400 },
      minSize: { width: 320, height: 200 },
      edgeMargin: 10,
      cascadeOffset: { x: 30, y: 20 },
      titlebarRecoverySize: { width: 120, height: 32 },
    },
    mode: "desktop",
    workArea: { x: 0, y: 0, width: 1000, height: 800 },
  });
  const store: WindowOperationStore = design.WindowStore;
  const transitions = new design.TransitionRegistry();
  const options: WindowOperationsOptions = { store, transitions };
  return {
    content,
    operations: new design.WindowOperations(options),
    store: design.WindowStore,
    transitions,
  };
};

/** 공개 Handle의 committed 결과를 성공 domain 결과로 좁힌다. */
const committedResult = async (handle: WindowOperationHandle): Promise<WindowCommittedResult> => {
  const result = await handle.committed;
  if (result.status === "failed") throw new Error("Window Operation commit이 실패했습니다");
  return result;
};

/** 공개 Handle의 presented 결과를 성공 domain 결과로 좁힌다. */
const presentedResult = async (handle: WindowOperationHandle): Promise<WindowPresentedResult> => {
  const result = await handle.presented;
  if ("source" in result) {
    throw new Error("Window Operation presentation 실행이 실패했습니다");
  }
  return result;
};

/** 공개 Handle의 settled 결과를 성공 domain 결과로 좁힌다. */
const settledResult = async (handle: WindowOperationHandle): Promise<WindowSettledResult> => {
  const result = await handle.settled;
  if (result.status === "failed") throw new Error("Window Operation settle이 실패했습니다");
  return result;
};

/** executor와 Store Promise continuation을 한 번 진행시킨다. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("public WindowOperations with WindowStore", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("A close 뒤 선택한 B의 기존 Operation settled 전에는 Content를 열지 않는다", async () => {
    const { content, operations, store, transitions } = await setup();
    const createdB = await store.createChromeWindow();
    const createdA = await store.createChromeWindow();
    if (!createdB.changed || !createdA.changed) throw new Error("Chrome Window 생성이 필요합니다");
    const bId = createdB.change.sessionId!;
    const aId = createdA.change.sessionId!;
    const maximizeAction: WindowAction = { type: "toggle-maximize", sessionId: bId };
    const closeAction: WindowAction = { type: "close", sessionId: aId };
    const openAction: WindowAction = { type: "open-content", content };

    const maximizing = operations.execute(maximizeAction);
    await committedResult(maximizing);
    const closing = operations.execute(closeAction);
    const opening = operations.execute(openAction);
    await flush();
    transitions.complete(closing.operationId, "window-exit");
    await settledResult(closing);
    await flush();

    let openingCommitted = false;
    void opening.committed.then(() => {
      openingCommitted = true;
    });
    await flush();
    const beforeBSettles = store.getSnapshot().sessions.find(({ id }) => id === bId);
    expect(beforeBSettles?.tabs).toHaveLength(1);
    expect(openingCommitted).toBe(false);
    await expect(
      committedResult(operations.execute({ type: "activate", sessionId: aId })),
    ).resolves.toMatchObject({
      status: "rejected",
      result: { reason: "session-not-found" },
    });

    transitions.complete(maximizing.operationId, "window-maximize");
    await presentedResult(maximizing);
    await settledResult(maximizing);
    const opened = await committedResult(opening);
    await settledResult(opening);
    expect(opened).toMatchObject({
      status: "committed",
      result: { change: { kind: "tab-added", sessionId: bId } },
    });
    expect(store.getSnapshot().sessions.find(({ id }) => id === bId)?.tabs).toHaveLength(2);
  });

  it("같은 B를 계속 선택하면 뒤의 명시적 B Action보다 먼저 요청 순서를 지킨다", async () => {
    const { content, operations, store, transitions } = await setup();
    const createdB = await store.createChromeWindow();
    if (!createdB.changed) throw new Error("Chrome Window 생성이 필요합니다");
    const bId = createdB.change.sessionId!;
    const changes: string[] = [];
    store.subscribe(() => {
      const latest = store.getSnapshot();
      changes.push(latest.sessions[0]?.frame.placement === "maximized" ? "maximize" : "open");
    });

    const opening = operations.execute({ type: "open-content", content });
    const maximizing = operations.execute({ type: "toggle-maximize", sessionId: bId });
    const firstCommit = await Promise.race([
      opening.committed.then(() => "open" as const),
      maximizing.committed.then(() => "maximize" as const),
    ]);
    expect(firstCommit).toBe("open");
    expect(changes[0]).toBe("open");

    await settledResult(opening);
    await committedResult(maximizing);
    expect(changes).toEqual(["open", "maximize"]);
    transitions.complete(maximizing.operationId, "window-maximize");
    await settledResult(maximizing);
  });

  it("Store 실행 직전 target이 B에서 C로 바뀌면 C queue까지 다시 기다린다", async () => {
    const { content, operations, store, transitions } = await setup();
    const createdB = await store.createChromeWindow();
    const createdC = await store.createChromeWindow();
    if (!createdB.changed || !createdC.changed) throw new Error("Chrome Window 생성이 필요합니다");
    const bId = createdB.change.sessionId!;
    const cId = createdC.change.sessionId!;
    const maximizingC = operations.execute({ type: "toggle-maximize", sessionId: cId });
    await committedResult(maximizingC);
    await store.activate(bId);

    const opening = operations.execute({ type: "open-content", content });
    const activatingC = store.activate(cId);
    await activatingC;
    await flush();

    let openingCommitted = false;
    void opening.committed.then(() => {
      openingCommitted = true;
    });
    await flush();
    expect(openingCommitted).toBe(false);
    expect(store.getSnapshot().sessions.find(({ id }) => id === cId)?.tabs).toHaveLength(1);

    transitions.complete(maximizingC.operationId, "window-maximize");
    await settledResult(maximizingC);
    const opened = await committedResult(opening);
    await settledResult(opening);
    expect(opened).toMatchObject({
      status: "committed",
      result: { change: { kind: "tab-added", sessionId: cId } },
    });
    expect(store.getSnapshot().sessions.find(({ id }) => id === cId)?.tabs).toHaveLength(2);
  });

  it("기다리던 B가 사라지면 새 Window enter와 재진입 Action 순서를 지킨다", async () => {
    const { content, operations, store, transitions } = await setup();
    const createdB = await store.createChromeWindow();
    if (!createdB.changed) throw new Error("Chrome Window 생성이 필요합니다");
    const bId = createdB.change.sessionId!;
    const maximizingB = operations.execute({ type: "toggle-maximize", sessionId: bId });
    await committedResult(maximizingB);
    let reentrant: WindowOperationHandle | undefined;
    store.subscribe(() => {
      const next = store.getSnapshot().sessions[0];
      if (next !== undefined && next.id !== bId && reentrant === undefined) {
        reentrant = operations.execute({ type: "activate", sessionId: next.id });
      }
    });

    const opening = operations.execute({ type: "open-content", content });
    const missingB = operations.execute({ type: "activate", sessionId: bId });
    await store.close(bId);
    transitions.complete(maximizingB.operationId, "window-maximize");
    await settledResult(maximizingB);
    const opened = await committedResult(opening);
    expect(opened).toMatchObject({
      status: "committed",
      result: { change: { kind: "window-created" } },
    });
    expect(reentrant).toBeDefined();
    await expect(committedResult(missingB)).resolves.toMatchObject({
      status: "rejected",
      result: { reason: "session-not-found" },
    });
    let reentrantCommitted = false;
    void reentrant!.committed.then(() => {
      reentrantCommitted = true;
    });
    await flush();
    expect(reentrantCommitted).toBe(false);

    transitions.complete(opening.operationId, "window-enter");
    await settledResult(opening);
    await expect(committedResult(reentrant!)).resolves.toMatchObject({ status: "no-op" });
    await settledResult(reentrant!);
  });
});
