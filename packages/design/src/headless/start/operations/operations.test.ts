import { describe, expect, it, vi } from "vitest";

import { createResourceRef } from "../../resources/index.js";
import { TransitionRegistry } from "../../runtime/index.js";
import type { StartStoreCommandContext } from "../startStore/index.js";
import type { StartStoreResult } from "../startStore/operationResult/index.js";
import { StartOperations, type StartOperationStore } from "./index.js";

/** resolver를 외부에서 제어하는 Promise를 만든다. */
const deferred = <Value>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
};

/** Operation executor 시작을 한 microtask 진행한다. */
const flush = () => new Promise<void>((resolve) => queueMicrotask(resolve));

describe("StartOperations", () => {
  it("Pin commit 뒤 enter를 시작하고 저장과 transition이 모두 끝날 때 settled된다", async () => {
    const resource = createResourceRef("content", "10000000-0000-4000-8000-000000000001");
    const save = deferred<StartStoreResult>();
    const value = { pinnedItems: [{ resource }] } as const;
    const store = {
      getSnapshot: () => ({ pinnedItems: [] }),
      isPinned: () => false,
      pin: vi.fn((_resource, context?: StartStoreCommandContext) => {
        context?.onCommit(value);
        return save.promise;
      }),
    } as unknown as StartOperationStore;
    const transitions = new TransitionRegistry();
    const operations = new StartOperations({ store, transitions });
    const handle = operations.execute({ type: "pin", resource });
    await flush();

    await expect(handle.committed).resolves.toEqual({ status: "committed", value });
    transitions.complete(handle.operationId, "start-item-enter");
    let settled = false;
    void handle.settled.then(() => {
      settled = true;
    });
    await flush();
    expect(settled).toBe(false);
    save.resolve({ ok: true, value });
    await expect(handle.settled).resolves.toMatchObject({ status: "settled" });
  });

  it("no-op은 transition 없이 끝나고 다음 목록 요청을 진행한다", async () => {
    const resource = createResourceRef("content", "10000000-0000-4000-8000-000000000002");
    const noOp = { ok: false, reason: "no-op" } as const;
    const pin = vi.fn(() => Promise.resolve(noOp));
    const store = {
      getSnapshot: () => ({ pinnedItems: [{ resource }] }),
      isPinned: () => true,
      pin,
    } as unknown as StartOperationStore;
    const operations = new StartOperations({ store });
    const first = operations.execute({ type: "pin", resource });
    const second = operations.execute({ type: "pin", resource });
    await expect(first.committed).resolves.toMatchObject({ status: "no-op" });
    await expect(second.settled).resolves.toMatchObject({ status: "settled" });
    expect(pin).toHaveBeenCalledTimes(2);
  });

  it("reorder는 이전 측정, commit, 새 측정과 이동 transition 순서를 지킨다", async () => {
    const first = createResourceRef("content", "10000000-0000-4000-8000-000000000003");
    const second = createResourceRef("content", "10000000-0000-4000-8000-000000000004");
    const initial = { pinnedItems: [{ resource: first }, { resource: second }] } as const;
    const value = { pinnedItems: [{ resource: second }, { resource: first }] } as const;
    const events: string[] = [];
    const reorder = vi.fn((_resource, _intent, context?: StartStoreCommandContext) => {
      events.push("commit");
      context?.onCommit(value);
      return Promise.resolve({ ok: true, value } as const);
    });
    const store = {
      getSnapshot: () => initial,
      isPinned: () => true,
      reorder,
    } as unknown as StartOperationStore;
    const transitions = new TransitionRegistry();
    const operations = new StartOperations({ store, transitions });
    const handle = operations.execute({ type: "reorder", resource: second, intent: "first" });
    await flush();
    expect(reorder).not.toHaveBeenCalled();
    expect(transitions.complete(handle.operationId, "start-reorder-measure-before")).toBe(true);
    await expect(handle.committed).resolves.toMatchObject({ status: "committed" });
    expect(events).toEqual(["commit"]);
    expect(transitions.complete(handle.operationId, "start-reorder-measure-after")).toBe(true);
    await flush();
    expect(transitions.complete(handle.operationId, "start-reorder-move")).toBe(true);
    await expect(handle.presented).resolves.toMatchObject({
      status: "sequence-completed",
      results: [
        { phase: "start-reorder-measure-before" },
        { phase: "start-reorder-measure-after" },
        { phase: "start-reorder-move" },
      ],
    });
  });
});
