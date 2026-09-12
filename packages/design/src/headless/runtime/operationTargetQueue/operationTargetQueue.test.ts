import { describe, expect, it, vi } from "vitest";

import { TransitionRegistry } from "../transitionRegistry/index.js";
import { OperationTargetQueue } from "./index.js";

const deferred = <Value>() => {
  let resolve: (value: Value) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
};

describe("OperationTargetQueue", () => {
  it("같은 target은 settled까지 기다리고 다른 target은 독립 실행한다", async () => {
    const queue = new OperationTargetQueue<string>();
    const firstGate = deferred<void>();
    const started: string[] = [];

    const first = queue.enqueue("A", async (operation) => {
      started.push("A-1");
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      await firstGate.promise;
      return { status: "settled", value: "A-1" } as const;
    });
    const second = queue.enqueue("A", (operation) => {
      started.push("A-2");
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      return Promise.resolve({ status: "settled", value: "A-2" } as const);
    });
    const independent = queue.enqueue("B", (operation) => {
      started.push("B-1");
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      return Promise.resolve({ status: "settled", value: "B-1" } as const);
    });

    await independent.settled;
    expect(started).toEqual(["A-1", "B-1"]);

    firstGate.resolve();
    await first.settled;
    await expect(second.settled).resolves.toEqual({ status: "settled", value: "A-2" });
    expect(started).toEqual(["A-1", "B-1", "A-2"]);
  });

  it("executor rejection 뒤 모든 Handle 대기와 cleanup을 끝내고 다음 요청을 실행한다", async () => {
    const queue = new OperationTargetQueue<string>();
    const cleanup = vi.fn();
    const nextStarted = vi.fn();

    const failed = queue.enqueue("A", (operation) => {
      operation.onCleanup(cleanup);
      throw new Error("transition start failed");
    });
    const next = queue.enqueue("A", (operation) => {
      nextStarted();
      operation.completeCommitted({ status: "no-op" } as const);
      operation.completePresented({ status: "skipped" } as const);
      return Promise.resolve({ status: "settled", reason: "no-op" } as const);
    });

    await expect(failed.committed).resolves.toMatchObject({
      status: "failed",
      source: "execution",
    });
    await expect(failed.presented).resolves.toMatchObject({
      status: "failed",
      source: "execution",
    });
    await expect(failed.settled).resolves.toMatchObject({
      status: "failed",
      source: "execution",
    });
    await expect(next.settled).resolves.toEqual({ status: "settled", reason: "no-op" });
    expect(cleanup).toHaveBeenCalledOnce();
    expect(nextStarted).toHaveBeenCalledOnce();
  });

  it("각 phase의 첫 완료만 적용하고 누락된 phase도 pending으로 남기지 않는다", async () => {
    const queue = new OperationTargetQueue<string>();

    const handle = queue.enqueue<
      Readonly<{ status: "committed"; revision: number }>,
      Readonly<{ status: "completed" }>,
      Readonly<{ status: "settled" }>
    >("A", (operation) => {
      expect(operation.completeCommitted({ status: "committed", revision: 1 } as const)).toBe(true);
      expect(operation.completeCommitted({ status: "committed", revision: 2 } as const)).toBe(
        false,
      );
      return Promise.resolve({ status: "settled" } as const);
    });

    await expect(handle.committed).resolves.toEqual({ status: "committed", revision: 1 });
    await expect(handle.presented).resolves.toEqual({
      status: "failed",
      source: "incomplete-phase",
      phase: "presented",
    });
    await expect(handle.settled).resolves.toEqual({
      status: "failed",
      source: "incomplete-phase",
      phase: "presented",
    });
  });

  it("생성 Operation에 새 target을 연결해 후속 요청의 추월을 막는다", async () => {
    const queue = new OperationTargetQueue<string>();
    const attached = deferred<void>();
    const creationGate = deferred<void>();
    const nextStarted = vi.fn();

    const creation = queue.reserve<
      Readonly<{ status: "committed"; sessionId: string }>,
      Readonly<{ status: "completed" }>,
      Readonly<{ status: "settled"; sessionId: string }>
    >(async (operation) => {
      expect(operation.attachTarget("created-session")).toBe(true);
      expect(operation.attachTarget("created-session")).toBe(true);
      operation.completeCommitted({ status: "committed", sessionId: "created-session" } as const);
      operation.completePresented({ status: "completed" } as const);
      attached.resolve();
      await creationGate.promise;
      return { status: "settled", sessionId: "created-session" } as const;
    });

    await attached.promise;
    const next = queue.enqueue("created-session", (operation) => {
      nextStarted();
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      return Promise.resolve({ status: "settled" } as const);
    });

    await Promise.resolve();
    expect(nextStarted).not.toHaveBeenCalled();
    creationGate.resolve();
    await creation.settled;
    await next.settled;
    expect(nextStarted).toHaveBeenCalledOnce();
  });

  it("예약 target 충돌은 기존 tail을 바꾸지 않고 false로 알린다", async () => {
    const queue = new OperationTargetQueue<string>();
    const existingGate = deferred<void>();
    const attachResult = deferred<boolean>();

    const existing = queue.enqueue("A", async (operation) => {
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      await existingGate.promise;
      return { status: "settled" } as const;
    });
    const reserved = queue.reserve((operation) => {
      attachResult.resolve(operation.attachTarget("A"));
      operation.completeCommitted({ status: "rejected" } as const);
      operation.completePresented({ status: "skipped" } as const);
      return Promise.resolve({ status: "settled" } as const);
    });

    await expect(attachResult.promise).resolves.toBe(false);
    await reserved.settled;
    existingGate.resolve();
    await existing.settled;
  });

  it("실행 중 target을 바꿀 때 이전 점유를 놓고 새 tail을 기다린다", async () => {
    const queue = new OperationTargetQueue<string>();
    const firstGate = deferred<void>();
    const secondGate = deferred<void>();
    const handoffGate = deferred<void>();
    const acquiredFirst = deferred<void>();
    const events: string[] = [];

    const first = queue.enqueue("A", async (operation) => {
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      await firstGate.promise;
      return { status: "settled" } as const;
    });
    const second = queue.enqueue("B", async (operation) => {
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      await secondGate.promise;
      return { status: "settled" } as const;
    });
    const dynamic = queue.reserveTarget("A", async (operation) => {
      const firstLease = await operation.acquireTarget("A");
      events.push("dynamic-A");
      acquiredFirst.resolve();
      await handoffGate.promise;
      firstLease.release();
      const secondLease = await operation.acquireTarget("B");
      events.push("dynamic-B");
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      expect(secondLease.target).toBe("B");
      return { status: "settled" } as const;
    });

    firstGate.resolve();
    await first.settled;
    await acquiredFirst.promise;
    const followingFirst = queue.enqueue("A", (operation) => {
      events.push("following-A");
      operation.completeCommitted({ status: "committed" } as const);
      operation.completePresented({ status: "completed" } as const);
      return Promise.resolve({ status: "settled" } as const);
    });
    await Promise.resolve();
    expect(events).toEqual(["dynamic-A"]);

    handoffGate.resolve();
    await followingFirst.settled;
    expect(events).toEqual(["dynamic-A", "following-A"]);

    secondGate.resolve();
    await second.settled;
    await dynamic.settled;
    expect(events).toEqual(["dynamic-A", "following-A", "dynamic-B"]);
  });

  it("executor rejection cleanup에서 남은 transition timer와 대기를 해제한다", async () => {
    vi.useFakeTimers();
    try {
      const queue = new OperationTargetQueue<string>();
      const transitions = new TransitionRegistry();

      const handle = queue.enqueue("A", (operation) => {
        void transitions.waitFor(operation.operationId, "enter");
        operation.onCleanup(() => {
          transitions.abortOperation(operation.operationId, "executor-failed");
        });
        return Promise.reject(new Error("store command rejected"));
      });

      await expect(handle.settled).resolves.toMatchObject({
        status: "failed",
        source: "execution",
      });
      expect(vi.getTimerCount()).toBe(0);
      expect(transitions.complete(handle.operationId, "enter")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});
