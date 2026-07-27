import type { ReactNode } from "react";

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TaskbarPanelContext, type TaskbarPanelContextValue } from "../../context";
import { useTaskbarPanelContext } from "./index";

const createContextValue = (): TaskbarPanelContextValue => ({
  activePanelId: null,
  closePanel: vi.fn(),
  completePanelTransition: vi.fn(),
  layerElement: null,
  openPanel: vi.fn(),
  panelStates: {},
});

describe("useTaskbarPanelContext", () => {
  it("TaskbarPanel 밖에서 사용하면 Root의 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useTaskbarPanelContext())).toThrow(
      "TaskbarPanel.Root는 TaskbarPanel 안에서 사용해야 합니다.",
    );
  });

  it("TaskbarPanel 안에서 사용하면 전역 panel 계약을 그대로 반환한다", () => {
    const value = createContextValue();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <TaskbarPanelContext.Provider value={value}>{children}</TaskbarPanelContext.Provider>
    );

    const { result } = renderHook(() => useTaskbarPanelContext(), { wrapper });

    expect(result.current).toBe(value);
  });
});
