import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useState } from "react";

import type { WindowItem } from "@window/ui";

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Windows } from "../../../../windows";
import { useWindowPanelCategories } from "./index";

const REACT = { id: "react", title: "React" } satisfies WindowItem;
const REDUX = { id: "redux", title: "Redux" } satisfies WindowItem;
const MEDIA = { id: "media", title: "미디어" } satisfies WindowItem;

let updateWindowsItems: Dispatch<SetStateAction<readonly WindowItem[]>>;

const Wrapper = ({ children }: { children: ReactNode }) => {
  const [windowsItems, setWindowsItems] = useState<readonly WindowItem[]>([REACT, REDUX, MEDIA]);
  updateWindowsItems = setWindowsItems;

  return <Windows windowsItems={windowsItems}>{children}</Windows>;
};

const renderCategories = (allViewSelected = true) =>
  renderHook(
    ({ selected }) =>
      useWindowPanelCategories({
        allViewSelected: selected,
      }),
    {
      initialProps: {
        selected: allViewSelected,
      },
      wrapper: Wrapper,
    },
  );

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useWindowPanelCategories", () => {
  it("전체 Windows item을 category section으로 제공하고 item 변경을 반영한다", () => {
    const { result } = renderCategories();

    expect(result.current.sections).toEqual([
      { category: "R", items: [REACT, REDUX] },
      { category: "ㅁ", items: [MEDIA] },
    ]);

    act(() => {
      updateWindowsItems([MEDIA]);
    });

    expect(result.current.sections).toEqual([{ category: "ㅁ", items: [MEDIA] }]);
  });

  it("category overlay 상태를 변경하고 pinned 화면으로 전환하면 닫는다", () => {
    const { result, rerender } = renderCategories();

    act(() => {
      result.current.onCategoryOverlayOpenChange(true);
    });
    expect(result.current.categoryOverlayOpen).toBe(true);

    rerender({ selected: false });

    expect(result.current.categoryOverlayOpen).toBe(false);
  });

  it("선택한 category 위치로 이동하고 overlay를 닫는다", () => {
    const { result } = renderCategories();
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
      result.current.onCategoryOverlayOpenChange(true);
      result.current.onCategorySelect("ㅁ");
    });

    expect(result.current.categoryOverlayOpen).toBe(false);
    expect(scrollTo).toHaveBeenCalledOnce();
    expect(scrollTo).toHaveBeenCalledWith({ top: 120 });
  });

  it("목록 ref나 선택한 category가 없어도 overlay를 닫고 이동을 요청하지 않는다", () => {
    const { result } = renderCategories();

    act(() => {
      result.current.onCategoryOverlayOpenChange(true);
      result.current.onCategorySelect("R");
    });
    expect(result.current.categoryOverlayOpen).toBe(false);

    const list = document.createElement("div");
    const scrollTo = vi.fn();
    list.scrollTo = scrollTo;
    result.current.allListRef.current = list;

    act(() => {
      result.current.onCategoryOverlayOpenChange(true);
      result.current.onCategorySelect("R");
    });

    expect(result.current.categoryOverlayOpen).toBe(false);
    expect(scrollTo).not.toHaveBeenCalled();
  });
});
