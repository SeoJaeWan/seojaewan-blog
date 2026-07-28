import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWindowPanelViewValue } from "./index";

describe("useWindowPanelViewValue", () => {
  it("pinned browse 화면으로 시작한다", () => {
    const { result } = renderHook(() => useWindowPanelViewValue());

    expect(result.current.view).toBe("pinned");
  });

  it("모두 화면으로 이동한다", () => {
    const { result } = renderHook(() => useWindowPanelViewValue());

    act(() => {
      result.current.showAll();
    });

    expect(result.current.view).toBe("all");
  });

  it("모두 화면에서 고정됨 화면으로 돌아간다", () => {
    const { result } = renderHook(() => useWindowPanelViewValue());

    act(() => {
      result.current.showAll();
    });
    act(() => {
      result.current.showPinned();
    });

    expect(result.current.view).toBe("pinned");
  });
});
