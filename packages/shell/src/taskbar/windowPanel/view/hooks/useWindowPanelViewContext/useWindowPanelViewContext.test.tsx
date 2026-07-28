import type { PropsWithChildren } from "react";

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WindowPanelViewContext, type WindowPanelViewContextValue } from "../../context";
import { useWindowPanelViewContext } from "./index";

describe("useWindowPanelViewContext", () => {
  it("Root가 제공하는 화면과 이동 action을 노출한다", () => {
    const value: WindowPanelViewContextValue = {
      showAll: vi.fn(),
      showPinned: vi.fn(),
      view: "all",
    };
    const wrapper = ({ children }: PropsWithChildren) => (
      <WindowPanelViewContext.Provider value={value}>{children}</WindowPanelViewContext.Provider>
    );
    const { result } = renderHook(() => useWindowPanelViewContext(), { wrapper });

    expect(result.current).toBe(value);
  });

  it("Root 밖에서 사용하면 소유 범위를 설명하는 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowPanelViewContext())).toThrow(
      "Window panel view는 WindowPanelView.Root 안에서 사용해야 합니다.",
    );
  });
});
