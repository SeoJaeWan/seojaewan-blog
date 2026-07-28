import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useState } from "react";

import type { WindowItem } from "@window/ui";

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Windows } from "../../../../windows";
import { useWindowPanelSearch } from "./index";

const REACT = { id: "react", title: "React" } satisfies WindowItem;
const REDUX = { id: "redux", title: "Redux" } satisfies WindowItem;
const MEDIA = { id: "media", title: "미디어" } satisfies WindowItem;
const INITIAL_ITEMS = [REACT, REDUX, MEDIA] satisfies readonly WindowItem[];

let updateWindowsItems: Dispatch<SetStateAction<readonly WindowItem[]>>;

const Wrapper = ({ children }: { children: ReactNode }) => {
  const [windowsItems, setWindowsItems] = useState<readonly WindowItem[]>(INITIAL_ITEMS);
  updateWindowsItems = setWindowsItems;

  return <Windows windowsItems={windowsItems}>{children}</Windows>;
};

const renderSearch = () => renderHook(() => useWindowPanelSearch(), { wrapper: Wrapper });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useWindowPanelSearch", () => {
  it("빈 검색어와 상세 선택이 없는 비활성 상태로 시작한다", () => {
    const { result } = renderSearch();

    expect(result.current.query).toBe("");
    expect(result.current.isActive).toBe(false);
    expect(result.current.results).toBe(INITIAL_ITEMS);
    expect(result.current.detailItemId).toBeNull();
    expect(result.current.detailItem).toBeNull();
  });

  it("공백 검색어는 비활성 상태를 유지하고 유효한 검색어는 검색을 활성화한다", () => {
    const { result } = renderSearch();

    act(() => {
      result.current.onQueryChange("   ");
    });
    expect(result.current.isActive).toBe(false);
    expect(result.current.results).toBe(INITIAL_ITEMS);

    act(() => {
      result.current.onQueryChange("redux");
    });
    expect(result.current.query).toBe("redux");
    expect(result.current.isActive).toBe(true);
    expect(result.current.results).toEqual([REDUX]);
  });

  it("검색어가 바뀌면 기존 상세 선택을 해제한다", () => {
    const { result } = renderSearch();

    act(() => {
      result.current.onQueryChange("re");
    });
    act(() => {
      result.current.onDetailItemChange(REACT);
    });
    expect(result.current.detailItemId).toBe("react");
    expect(result.current.detailItem).toBe(REACT);

    act(() => {
      result.current.onQueryChange("red");
    });

    expect(result.current.detailItemId).toBeNull();
    expect(result.current.detailItem).toBeNull();
  });

  it("선택한 item이 검색 결과에서 사라지면 상세 선택을 해제한다", () => {
    const { result } = renderSearch();

    act(() => {
      result.current.onQueryChange("re");
    });
    act(() => {
      result.current.onDetailItemChange(REACT);
    });
    act(() => {
      updateWindowsItems([REDUX, MEDIA]);
    });

    expect(result.current.detailItemId).toBeNull();
    expect(result.current.detailItem).toBeNull();
  });

  it("Windows item이 갱신되면 검색 결과와 상세 item에 같은 ID의 최신 객체를 제공한다", () => {
    const { result } = renderSearch();

    act(() => {
      result.current.onQueryChange("react");
    });
    act(() => {
      result.current.onDetailItemChange(REACT);
    });
    const updatedReact = { id: "react", title: "React 업데이트" } satisfies WindowItem;

    act(() => {
      updateWindowsItems([updatedReact, REDUX, MEDIA]);
    });

    expect(result.current.results).toEqual([updatedReact]);
    expect(result.current.detailItemId).toBe("react");
    expect(result.current.detailItem).toBe(updatedReact);
  });
});
