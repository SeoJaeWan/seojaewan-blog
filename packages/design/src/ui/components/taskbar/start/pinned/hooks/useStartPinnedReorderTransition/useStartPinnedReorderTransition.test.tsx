import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { OperationId, StartCommittedResult, StartControllerActions, StartOperationHandle } from "../../../../../../../headless/index.js";
import { useStartPinnedReorderTransition } from "./index.js";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type Deferred<Value> = { promise: Promise<Value>; resolve: (value: Value) => void };
const deferred = <Value,>(): Deferred<Value> => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((done) => { resolve = done; });
  return { promise, resolve };
};

const createHandle = (committed: Promise<StartCommittedResult>) => ({
  operationId: "start-reorder" as OperationId,
  committed,
  presented: new Promise(() => undefined),
  settled: new Promise(() => undefined),
}) as StartOperationHandle;

describe("useStartPinnedReorderTransition", () => {
  it("measure-before 완료 뒤 no-op commit은 pending reorder를 해제한다", async () => {
    const committed = deferred<StartCommittedResult>();
    const actions = {
      completeTransition: vi.fn(() => true), abortTransition: vi.fn(),
    } as unknown as StartControllerActions;
    const hook = renderHook(() => useStartPinnedReorderTransition({
      actions, elements: { current: new Map() }, items: [],
    }));
    act(() => hook.result.current.trackReorder(createHandle(committed.promise), new Map()));
    await act(() => Promise.resolve());
    expect(hook.result.current.hasPendingReorder()).toBe(true);

    committed.resolve({ status: "no-op" } as StartCommittedResult);
    await act(() => committed.promise);
    expect(hook.result.current.hasPendingReorder()).toBe(false);
  });

  it("unmount는 현재 exact phase를 abort하고 pending 상태를 정리한다", async () => {
    const committed = new Promise<StartCommittedResult>(() => undefined);
    const abortTransition = vi.fn(() => true);
    const actions = { completeTransition: vi.fn(() => true), abortTransition } as unknown as StartControllerActions;
    const handle = createHandle(committed);
    const hook = renderHook(() => useStartPinnedReorderTransition({
      actions, elements: { current: new Map() }, items: [],
    }));
    act(() => hook.result.current.trackReorder(handle, new Map()));
    await act(() => Promise.resolve());
    hook.unmount();

    expect(abortTransition).toHaveBeenCalledExactlyOnceWith(
      handle.operationId,
      "start-reorder-measure-after",
      "start-pinned-component-unmounted",
    );
  });
});
