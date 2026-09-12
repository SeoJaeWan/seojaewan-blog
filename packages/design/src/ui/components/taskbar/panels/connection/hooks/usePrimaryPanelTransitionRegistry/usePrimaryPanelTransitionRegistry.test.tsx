import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  type OperationId,
  PRIMARY_PANEL_ENTER_PHASE,
  PRIMARY_PANEL_EXIT_PHASE,
  type PrimaryPanelControllerActions,
  type PrimaryPanelOperationHandle,
} from "../../../../../../../headless/index.js";
import { usePrimaryPanelTransitionRegistry } from "./index.js";

afterEach(cleanup);

const pendingHandle = (operationId: OperationId) =>
  ({
    operationId,
    settled: new Promise(() => undefined),
  }) as unknown as PrimaryPanelOperationHandle;

describe("usePrimaryPanelTransitionRegistry", () => {
  it("등록 전·내부 실행 Handle을 추적하고 중복 재전달·settled·구독 해제를 정리한다", async () => {
    let listener: ((handle: PrimaryPanelOperationHandle) => void) | undefined;
    let settle: (() => void) | undefined;
    const handle = {
      operationId: "internal-close" as OperationId,
      settled: new Promise<void>((resolve) => {
        settle = resolve;
      }),
    } as unknown as PrimaryPanelOperationHandle;
    const unsubscribe = vi.fn();
    const actions = {
      subscribeOperations: vi.fn((next: typeof listener) => {
        listener = next;
        next!(handle);
        next!(handle);
        return unsubscribe;
      }),
      completeTransition: vi.fn(() => false),
      abortTransition: vi.fn(() => false),
    } as unknown as PrimaryPanelControllerActions;
    const hook = renderHook(() => usePrimaryPanelTransitionRegistry(actions));
    act(() => hook.result.current.completeTransition(false));
    expect(actions.completeTransition).toHaveBeenCalledExactlyOnceWith(
      handle.operationId,
      PRIMARY_PANEL_EXIT_PHASE,
    );

    await act(async () => {
      settle!();
      await handle.settled;
    });
    vi.mocked(actions.completeTransition).mockClear();
    act(() => hook.result.current.completeTransition(false));
    expect(actions.completeTransition).not.toHaveBeenCalled();
    act(() => listener!(pendingHandle("next-close" as OperationId)));
    hook.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
    expect(actions.abortTransition).toHaveBeenCalledWith(
      "next-close",
      PRIMARY_PANEL_EXIT_PHASE,
      "taskbar-panels-connection-unmounted",
    );
  });

  it("현재 방향과 일치하는 첫 operation의 exact phase만 완료한다", () => {
    const completeTransition = vi.fn(
      (_id: OperationId, phase: string) => phase === PRIMARY_PANEL_ENTER_PHASE,
    );
    const actions = {
      subscribeOperations: () => () => undefined,
      completeTransition,
      abortTransition: vi.fn(),
    } as unknown as PrimaryPanelControllerActions;
    const first = pendingHandle("panel-1" as OperationId);
    const second = pendingHandle("panel-2" as OperationId);
    const hook = renderHook(() => usePrimaryPanelTransitionRegistry(actions));
    act(() => {
      void hook.result.current.trackOperation(first);
      void hook.result.current.trackOperation(second);
    });

    act(() => hook.result.current.completeTransition(true));

    expect(completeTransition).toHaveBeenCalledExactlyOnceWith(
      first.operationId,
      PRIMARY_PANEL_ENTER_PHASE,
    );
  });

  it("widget 취소는 현재 방향 phase와 고정된 사유로 첫 waiter만 abort한다", () => {
    const abortTransition = vi.fn(() => true);
    const actions = {
      subscribeOperations: () => () => undefined,
      completeTransition: vi.fn(),
      abortTransition,
    } as unknown as PrimaryPanelControllerActions;
    const handle = pendingHandle("panel-1" as OperationId);
    const hook = renderHook(() => usePrimaryPanelTransitionRegistry(actions));
    act(() => {
      void hook.result.current.trackOperation(handle);
    });

    act(() => hook.result.current.cancelTransition(false));

    expect(abortTransition).toHaveBeenCalledExactlyOnceWith(
      handle.operationId,
      PRIMARY_PANEL_EXIT_PHASE,
      "taskbar-panel-widget-transition-cancelled",
    );
  });

  it("unmount는 남은 operation의 enter와 exit waiter를 모두 중단한다", () => {
    const abortTransition = vi.fn(() => false);
    const actions = {
      subscribeOperations: () => () => undefined,
      completeTransition: vi.fn(),
      abortTransition,
    } as unknown as PrimaryPanelControllerActions;
    const handle = pendingHandle("panel-1" as OperationId);
    const hook = renderHook(() => usePrimaryPanelTransitionRegistry(actions));
    act(() => {
      void hook.result.current.trackOperation(handle);
    });
    hook.unmount();

    expect(abortTransition.mock.calls).toEqual([
      [handle.operationId, PRIMARY_PANEL_EXIT_PHASE, "taskbar-panels-connection-unmounted"],
      [handle.operationId, PRIMARY_PANEL_ENTER_PHASE, "taskbar-panels-connection-unmounted"],
    ]);
  });
});
