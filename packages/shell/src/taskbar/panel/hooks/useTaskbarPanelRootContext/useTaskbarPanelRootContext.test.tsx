import type { ReactNode } from "react";
import { createRef } from "react";

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  TaskbarPanelRootContext,
  type TaskbarPanelRootContextValue,
} from "../../context";
import { useTaskbarPanelRootContext } from "./index";

const createRootContextValue = (): TaskbarPanelRootContextValue => ({
  close: vi.fn(),
  contentId: "taskbar-panel-content-start",
  isOpen: false,
  layerElement: null,
  panelRef: createRef<HTMLDivElement>(),
  panelState: null,
  positionStyle: { visibility: "hidden" },
  toggle: vi.fn(),
  triggerRef: createRef<HTMLButtonElement>(),
});

describe("useTaskbarPanelRootContext", () => {
  it("Root 밖에서 사용하면 Trigger와 Content의 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useTaskbarPanelRootContext())).toThrow(
      "TaskbarPanel.Trigger와 TaskbarPanel.Content는 TaskbarPanel.Root 안에서 사용해야 합니다.",
    );
  });

  it("Root 안에서 사용하면 panel scope 계약을 그대로 반환한다", () => {
    const value = createRootContextValue();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TaskbarPanelRootContext.Provider value={value}>
        {children}
      </TaskbarPanelRootContext.Provider>
    );

    const { result } = renderHook(() => useTaskbarPanelRootContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
