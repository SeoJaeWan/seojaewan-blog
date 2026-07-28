import type { MouseEvent, PropsWithChildren } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ContextMenuContext, type ContextMenuContextValue } from "../../context";
import { useContextMenuTrigger } from ".";

const item = { id: "notes", title: "메모장" };

const createEvent = (currentTarget: HTMLButtonElement, clientX: number, clientY: number) => {
  const preventDefault = vi.fn();

  return {
    event: {
      clientX,
      clientY,
      currentTarget,
      preventDefault,
    } as unknown as MouseEvent<HTMLButtonElement>,
    preventDefault,
  };
};

describe("useContextMenuTrigger", () => {
  it("target의 entry와 callback을 전역 Host 요청에 연결한다", () => {
    const contextValue: ContextMenuContextValue = {
      close: vi.fn(),
      open: vi.fn(),
    };
    const wrapper = ({ children }: PropsWithChildren) => (
      <ContextMenuContext.Provider value={contextValue}>{children}</ContextMenuContext.Provider>
    );
    const onAction = vi.fn();
    const onOpen = vi.fn();
    const { result } = renderHook(
      () =>
        useContextMenuTrigger({
          animated: false,
          getEntries: (target: typeof item) => [
            { id: "open", label: `열기: ${target.title}`, type: "action" as const },
          ],
          onAction,
          onOpen,
        }),
      { wrapper },
    );
    const triggerElement = document.createElement("button");
    const { event, preventDefault } = createEvent(triggerElement, 120, 140);

    act(() => {
      result.current(event, item);
    });

    expect(preventDefault).toHaveBeenCalledOnce();
    expect(onOpen).toHaveBeenCalledWith(item);
    expect(contextValue.open).toHaveBeenCalledOnce();

    const request = vi.mocked(contextValue.open).mock.calls[0]?.[0];

    expect(request).toMatchObject({
      anchorX: 120,
      anchorY: 140,
      animated: false,
      triggerElement,
    });
    expect(request?.getEntries()).toEqual([{ id: "open", label: "열기: 메모장", type: "action" }]);

    request?.onAction("open");
    expect(onAction).toHaveBeenCalledWith("open", item);
  });

  it("keyboard 요청 좌표가 0이면 trigger의 왼쪽 아래를 기준점으로 사용한다", () => {
    const contextValue: ContextMenuContextValue = {
      close: vi.fn(),
      open: vi.fn(),
    };
    const wrapper = ({ children }: PropsWithChildren) => (
      <ContextMenuContext.Provider value={contextValue}>{children}</ContextMenuContext.Provider>
    );
    const { result } = renderHook(
      () =>
        useContextMenuTrigger({
          getEntries: () => [],
          onAction: vi.fn(),
        }),
      { wrapper },
    );
    const triggerElement = document.createElement("button");

    vi.spyOn(triggerElement, "getBoundingClientRect").mockReturnValue({
      bottom: 180,
      height: 40,
      left: 160,
      right: 200,
      toJSON: () => ({}),
      top: 140,
      width: 40,
      x: 160,
      y: 140,
    });

    act(() => {
      result.current(createEvent(triggerElement, 0, 0).event, item);
    });

    expect(contextValue.open).toHaveBeenCalledWith(
      expect.objectContaining({
        anchorX: 160,
        anchorY: 180,
      }),
    );
  });

  it("consumer가 unmount되면 자신이 연 메뉴만 focus 복원 없이 닫는다", () => {
    const contextValue: ContextMenuContextValue = {
      close: vi.fn(),
      open: vi.fn(),
    };
    const wrapper = ({ children }: PropsWithChildren) => (
      <ContextMenuContext.Provider value={contextValue}>{children}</ContextMenuContext.Provider>
    );
    const { unmount } = renderHook(
      () =>
        useContextMenuTrigger({
          getEntries: () => [],
          onAction: vi.fn(),
        }),
      { wrapper },
    );

    unmount();

    const closeCall = vi.mocked(contextValue.close).mock.calls[0];

    expect(closeCall?.[0]).toBe("programmatic");
    expect(typeof closeCall?.[1]?.ownerId).toBe("string");
    expect(closeCall?.[1]?.restoreFocus).toBe(false);
  });

  it("Provider 밖에서 사용하면 범용 Host 누락 오류를 발생시킨다", () => {
    expect(() =>
      renderHook(() =>
        useContextMenuTrigger({
          getEntries: () => [],
          onAction: vi.fn(),
        }),
      ),
    ).toThrow("useContextMenuTrigger는 ContextMenuProvider 안에서 사용해야 합니다.");
  });
});
