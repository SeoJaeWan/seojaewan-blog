import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskbarPanelTransition } from "./index.js";
afterEach(cleanup);
describe("useTaskbarPanelTransition", () => {
  it("현재 방향의 완료를 한 번 전달하고 완료 뒤 unmount는 중단하지 않는다", () => {
    const cancel = vi.fn();
    const complete = vi.fn();
    const hook = renderHook(() => useTaskbarPanelTransition(true, cancel, complete));
    act(() => {
      hook.result.current(true);
      hook.result.current(true);
    });
    expect(complete).toHaveBeenCalledExactlyOnceWith(true);
    hook.unmount();
    expect(cancel).not.toHaveBeenCalled();
  });
  it("반대 방향으로 전환하면 이전 방향을 중단하고 늦은 완료를 무시한다", () => {
    const cancel = vi.fn();
    const complete = vi.fn();
    const hook = renderHook(({ open }) => useTaskbarPanelTransition(open, cancel, complete), {
      initialProps: { open: true },
    });
    hook.rerender({ open: false });
    expect(cancel).toHaveBeenCalledExactlyOnceWith(true);
    act(() => hook.result.current(true));
    expect(complete).not.toHaveBeenCalled();
    act(() => hook.result.current(false));
    expect(complete).toHaveBeenCalledExactlyOnceWith(false);
  });
  it("닫힌 초기 상태에는 대기 작업이 없고 열리는 중 unmount는 취소한다", () => {
    const cancel = vi.fn();
    const complete = vi.fn();
    const hook = renderHook(({ open }) => useTaskbarPanelTransition(open, cancel, complete), {
      initialProps: { open: false },
    });
    act(() => hook.result.current(false));
    expect(complete).not.toHaveBeenCalled();
    hook.rerender({ open: true });
    hook.unmount();
    expect(cancel).toHaveBeenCalledExactlyOnceWith(true);
  });
  it("rerender 뒤 최신 callback으로 완료를 전달한다", () => {
    const first = vi.fn();
    const latest = vi.fn();
    const hook = renderHook(
      ({ complete }) => useTaskbarPanelTransition(true, undefined, complete),
      { initialProps: { complete: first } },
    );
    hook.rerender({ complete: latest });
    act(() => hook.result.current(true));
    expect(first).not.toHaveBeenCalled();
    expect(latest).toHaveBeenCalledExactlyOnceWith(true);
  });
});
