import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useWindowsPanelNavigation } from "./index";

describe("useWindowsPanelNavigation", () => {
  it("pinned view와 닫힌 category overlay로 시작한다", () => {
    const { result } = renderHook(() => useWindowsPanelNavigation());

    expect(result.current.view).toBe("pinned");
    expect(result.current.categoryOverlayOpen).toBe(false);
  });

  it("pinned view로 돌아가면 열린 category overlay도 닫는다", () => {
    const { result } = renderHook(() => useWindowsPanelNavigation());

    act(() => {
      result.current.onViewChange("all");
      result.current.onCategoryOverlayOpenChange(true);
    });

    expect(result.current.view).toBe("all");
    expect(result.current.categoryOverlayOpen).toBe(true);

    act(() => {
      result.current.onViewChange("pinned");
    });

    expect(result.current.view).toBe("pinned");
    expect(result.current.categoryOverlayOpen).toBe(false);
  });

  it("선택한 category 위치로 모두 보기 목록을 이동한다", () => {
    const { result } = renderHook(() => useWindowsPanelNavigation());
    const list = document.createElement("div");
    const category = document.createElement("button");
    const scrollTo = vi.fn();

    category.dataset.category = "ㅁ";
    list.append(category);
    Object.defineProperty(list, "offsetTop", { configurable: true, value: 20 });
    Object.defineProperty(category, "offsetTop", { configurable: true, value: 140 });
    list.scrollTo = scrollTo;
    result.current.allListRef.current = list;

    act(() => {
      result.current.onCategorySelect("ㅁ");
    });

    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 120 });
  });

  it("목록 ref나 선택한 category가 없으면 이동을 요청하지 않는다", () => {
    const { result } = renderHook(() => useWindowsPanelNavigation());

    expect(() => result.current.onCategorySelect("R")).not.toThrow();

    const list = document.createElement("div");
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo;
    result.current.allListRef.current = list;

    expect(() => result.current.onCategorySelect("R")).not.toThrow();
    expect(scrollTo).not.toHaveBeenCalled();
  });

});
