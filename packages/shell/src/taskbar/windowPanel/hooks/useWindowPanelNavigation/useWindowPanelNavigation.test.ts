import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useWindowPanelNavigation } from "./index";

describe("useWindowPanelNavigation", () => {
  it("검색이 비활성화된 pinned browse 화면으로 시작한다", () => {
    const { result } = renderHook(() =>
      useWindowPanelNavigation({
        searchActive: false,
      }),
    );

    expect(result.current.activeView).toBe("pinned");
    expect(result.current.browseView).toBe("pinned");
  });

  it("pinned/all browse 화면을 변경한다", () => {
    const { result } = renderHook(() =>
      useWindowPanelNavigation({
        searchActive: false,
      }),
    );

    act(() => {
      result.current.onBrowseViewChange("all");
    });

    expect(result.current.activeView).toBe("all");
    expect(result.current.browseView).toBe("all");

    act(() => {
      result.current.onBrowseViewChange("pinned");
    });

    expect(result.current.activeView).toBe("pinned");
    expect(result.current.browseView).toBe("pinned");
  });

  it("검색 중에는 기존 browse 화면을 보존하고 검색 종료 후 해당 화면으로 돌아간다", () => {
    const { result, rerender } = renderHook(
      ({ searchActive }) => useWindowPanelNavigation({ searchActive }),
      {
        initialProps: {
          searchActive: false,
        },
      },
    );

    act(() => {
      result.current.onBrowseViewChange("all");
    });
    rerender({ searchActive: true });

    expect(result.current.activeView).toBe("search");
    expect(result.current.browseView).toBe("all");

    rerender({ searchActive: false });

    expect(result.current.activeView).toBe("all");
    expect(result.current.browseView).toBe("all");
  });
});
