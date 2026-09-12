import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OperationId } from "../operationHandle/index.js";
import { DEFAULT_TRANSITION_WATCHDOG_MS, TransitionRegistry } from "./index.js";

const operationId = "operation-1" as OperationId;

describe("TransitionRegistry", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("operation ID와 phase가 모두 맞는 첫 완료만 전달한다", async () => {
    const registry = new TransitionRegistry();
    const result = registry.waitFor(operationId, "enter");

    expect(registry.complete(operationId, "exit")).toBe(false);
    expect(registry.complete("other" as OperationId, "enter")).toBe(false);
    expect(registry.complete(operationId, "enter")).toBe(true);
    expect(registry.complete(operationId, "enter")).toBe(false);

    await expect(result).resolves.toEqual({ status: "completed", operationId, phase: "enter" });
  });

  it("같은 transition을 기다리는 consumer는 동일한 첫 결과로 모두 종료한다", async () => {
    const registry = new TransitionRegistry();
    const first = registry.waitFor(operationId, "exit");
    const second = registry.waitFor(operationId, "exit");

    expect(second).toBe(first);
    expect(registry.abort(operationId, "exit", "component-unmounted")).toBe(true);
    await expect(Promise.all([first, second])).resolves.toEqual([
      {
        status: "aborted",
        operationId,
        phase: "exit",
        reason: "component-unmounted",
      },
      {
        status: "aborted",
        operationId,
        phase: "exit",
        reason: "component-unmounted",
      },
    ]);
  });

  it("기본 1000ms watchdog으로 누락 신호를 종료하고 늦은 완료를 무시한다", async () => {
    const registry = new TransitionRegistry();
    const result = registry.waitFor(operationId, "move");
    let settled = false;
    void result.then(() => {
      settled = true;
    });

    await vi.advanceTimersByTimeAsync(DEFAULT_TRANSITION_WATCHDOG_MS - 1);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);

    await expect(result).resolves.toEqual({
      status: "watchdog",
      operationId,
      phase: "move",
      timeoutMs: DEFAULT_TRANSITION_WATCHDOG_MS,
    });
    expect(registry.complete(operationId, "move")).toBe(false);
  });

  it("한 Operation의 등록된 모든 phase를 중단하고 각 timer를 정리한다", async () => {
    const registry = new TransitionRegistry();
    const enter = registry.waitFor(operationId, "enter");
    const layout = registry.waitFor(operationId, "layout");

    expect(registry.abortOperation(operationId, "operation-settled")).toBe(2);
    expect(registry.abortOperation(operationId, "duplicate")).toBe(0);
    await expect(enter).resolves.toMatchObject({ status: "aborted", phase: "enter" });
    await expect(layout).resolves.toMatchObject({ status: "aborted", phase: "layout" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("UI transition 실패를 제품 거절과 구분한 failed 결과로 전달한다", async () => {
    const registry = new TransitionRegistry();
    const error = new Error("animation adapter failed");
    const result = registry.waitFor(operationId, "enter");

    expect(registry.fail(operationId, "enter", error)).toBe(true);
    await expect(result).resolves.toEqual({
      status: "failed",
      operationId,
      phase: "enter",
      error,
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("잘못된 watchdog 값은 등록 전에 거절한다", () => {
    const registry = new TransitionRegistry();

    expect(() => registry.waitFor(operationId, "enter", { timeoutMs: -1 })).toThrow(
      "transition watchdog 시간은 0 이상의 finite 숫자여야 합니다",
    );
    expect(() => registry.waitFor(operationId, "enter", { timeoutMs: Number.NaN })).toThrow(
      RangeError,
    );
    expect(vi.getTimerCount()).toBe(0);
  });
});
