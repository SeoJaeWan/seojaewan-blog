import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useState } from "react";

import type { WindowItem } from "@window/ui";

import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { Windows } from "../../../../windows";
import { useTaskSearch } from "./index";

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

const renderSearch = () => renderHook(() => useTaskSearch(), { wrapper: Wrapper });

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("useTaskSearch", () => {
  describe("검색어와 결과", () => {
    it("빈 검색어는 검색을 비활성화하고 전체 Windows item을 제공한다", () => {
      const { result } = renderSearch();

      expect(result.current.isActive).toBe(false);
      expect(result.current.results).toBe(INITIAL_ITEMS);
    });

    it("공백 검색어는 검색을 활성화하지 않고 전체 Windows item을 유지한다", () => {
      const { result } = renderSearch();

      act(() => {
        result.current.onQueryChange("   ");
      });

      expect(result.current.isActive).toBe(false);
      expect(result.current.results).toBe(INITIAL_ITEMS);
    });

    it("유효한 검색어는 검색을 활성화하고 일치하는 item을 제공한다", () => {
      const { result } = renderSearch();

      act(() => {
        result.current.onQueryChange("redux");
      });

      expect(result.current.query).toBe("redux");
      expect(result.current.isActive).toBe(true);
      expect(result.current.results).toEqual([REDUX]);
    });

    it("Windows item이 변경되면 검색 결과를 갱신한다", () => {
      const { result } = renderSearch();
      const updatedReact = { id: "react", title: "React 업데이트" } satisfies WindowItem;

      act(() => {
        result.current.onQueryChange("react");
      });
      act(() => {
        updateWindowsItems([updatedReact, REDUX, MEDIA]);
      });

      expect(result.current.results).toEqual([updatedReact]);
    });
  });

  describe("상세 선택", () => {
    it("검색 결과 item을 상세 item으로 선택한다", () => {
      const { result } = renderSearch();

      act(() => {
        result.current.onQueryChange("re");
      });
      act(() => {
        result.current.onDetailItemChange(REACT);
      });

      expect(result.current.detailItemId).toBe("react");
      expect(result.current.detailItem).toBe(REACT);
    });

    it("검색어가 변경되면 기존 상세 선택을 해제한다", () => {
      const { result } = renderSearch();

      act(() => {
        result.current.onQueryChange("re");
      });
      act(() => {
        result.current.onDetailItemChange(REACT);
      });
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

    it("선택한 item이 같은 ID로 갱신되면 최신 객체를 제공한다", () => {
      const { result } = renderSearch();
      const updatedReact = { id: "react", title: "React 업데이트" } satisfies WindowItem;

      act(() => {
        result.current.onQueryChange("react");
      });
      act(() => {
        result.current.onDetailItemChange(REACT);
      });
      act(() => {
        updateWindowsItems([updatedReact, REDUX, MEDIA]);
      });

      expect(result.current.detailItemId).toBe("react");
      expect(result.current.detailItem).toBe(updatedReact);
    });
  });
});
