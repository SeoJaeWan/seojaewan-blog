import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWindowPanelNavigation } from "./index";

describe("useWindowPanelNavigation", () => {
  it("pinned browse 화면으로 시작한다", () => {
    const { result } = renderHook(() => useWindowPanelNavigation());

    expect(result.current.browseView).toBe("pinned");
  });

  it("all browse 화면으로 변경한다", () => {
    const { result } = renderHook(() => useWindowPanelNavigation());

    act(() => {
      result.current.onBrowseViewChange("all");
    });

    expect(result.current.browseView).toBe("all");
  });

  it("all browse 화면에서 pinned browse 화면으로 돌아간다", () => {
    const { result } = renderHook(() => useWindowPanelNavigation());

    act(() => {
      result.current.onBrowseViewChange("all");
    });
    expect(result.current.browseView).toBe("all");

    act(() => {
      result.current.onBrowseViewChange("pinned");
    });

    expect(result.current.browseView).toBe("pinned");
  });
});
