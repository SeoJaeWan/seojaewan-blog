import type { MouseEvent, ReactNode } from "react";
import { createRef } from "react";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TaskbarPanelRootContext,
  type TaskbarPanelRootContextValue,
} from "../../context";
import { useTaskbarPanelTriggerValue } from "./index";

const createRootContextValue = (
  overrides: Partial<TaskbarPanelRootContextValue> = {},
): TaskbarPanelRootContextValue => ({
  close: vi.fn(),
  contentId: "taskbar-panel-content-start",
  isOpen: false,
  layerElement: null,
  panelRef: createRef<HTMLDivElement>(),
  panelState: null,
  positionStyle: { visibility: "hidden" },
  toggle: vi.fn(),
  triggerRef: createRef<HTMLButtonElement>(),
  ...overrides,
});

const renderTriggerValue = (value: TaskbarPanelRootContextValue) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <TaskbarPanelRootContext.Provider value={value}>
      {children}
    </TaskbarPanelRootContext.Provider>
  );

  return renderHook(() => useTaskbarPanelTriggerValue(), { wrapper });
};

describe("useTaskbarPanelTriggerValue", () => {
  it("닫힌 panel의 Content ID와 닫힌 접근성 상태를 제공한다", () => {
    const value = createRootContextValue();
    const { result } = renderTriggerValue(value);

    expect(result.current).toMatchObject({
      "aria-controls": "taskbar-panel-content-start",
      "aria-expanded": false,
      "aria-haspopup": "dialog",
      "aria-pressed": undefined,
      "data-selected": undefined,
      ref: value.triggerRef,
    });
  });

  it("열린 panel의 선택 상태를 접근성 속성으로 제공한다", () => {
    const { result } = renderTriggerValue(createRootContextValue({ isOpen: true }));

    expect(result.current).toMatchObject({
      "aria-expanded": true,
      "aria-pressed": true,
      "data-selected": "true",
    });
  });

  it("취소되지 않은 click은 현재 panel을 toggle한다", () => {
    const value = createRootContextValue();
    const { result } = renderTriggerValue(value);

    act(() => {
      result.current.onClick({ defaultPrevented: false } as MouseEvent<HTMLElement>);
    });

    expect(value.toggle).toHaveBeenCalledOnce();
  });

  it("child가 기본 동작을 막은 click은 panel을 toggle하지 않는다", () => {
    const value = createRootContextValue();
    const { result } = renderTriggerValue(value);

    act(() => {
      result.current.onClick({ defaultPrevented: true } as MouseEvent<HTMLElement>);
    });

    expect(value.toggle).not.toHaveBeenCalled();
  });
});
