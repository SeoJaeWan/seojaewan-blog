import type { WindowItem } from "@window/ui";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useSearchResultDetail } from "./index";

const RESULTS: readonly WindowItem[] = [
  { id: "react", title: "React" },
  { id: "redux", title: "Redux" },
];

describe("useSearchResultDetail", () => {
  it("상세 선택 없이 시작하고 선택한 item을 유지한다", () => {
    const { result } = renderHook(() =>
      useSearchResultDetail({ results: RESULTS, searchValue: "re" }),
    );

    expect(result.current.detailItem).toBeNull();

    act(() => {
      result.current.onDetailItemChange(RESULTS[0]);
      result.current.onDetailItemChange(RESULTS[0]);
    });

    expect(result.current.detailItem).toBe(RESULTS[0]);
  });

  it("검색어가 바뀌면 기존 상세 선택을 해제한다", () => {
    const { result, rerender } = renderHook(
      ({ searchValue }) => useSearchResultDetail({ results: RESULTS, searchValue }),
      { initialProps: { searchValue: "re" } },
    );

    act(() => {
      result.current.onDetailItemChange(RESULTS[0]);
    });
    rerender({ searchValue: "rea" });

    expect(result.current.detailItem).toBeNull();
  });

  it("선택한 item이 결과에서 사라지면 상세 선택을 해제한다", () => {
    const { result, rerender } = renderHook(
      ({ results }) => useSearchResultDetail({ results, searchValue: "re" }),
      { initialProps: { results: RESULTS } },
    );

    act(() => {
      result.current.onDetailItemChange(RESULTS[0]);
    });
    rerender({ results: [RESULTS[1]] });

    expect(result.current.detailItem).toBeNull();
  });

  it("같은 ID의 결과 객체가 바뀌면 최신 item을 반환한다", () => {
    const { result, rerender } = renderHook(
      ({ results }) => useSearchResultDetail({ results, searchValue: "re" }),
      { initialProps: { results: RESULTS } },
    );

    act(() => {
      result.current.onDetailItemChange(RESULTS[0]);
    });
    const updatedItem: WindowItem = { id: "react", title: "React 업데이트" };
    rerender({ results: [updatedItem, RESULTS[1]] });

    expect(result.current.detailItem).toBe(updatedItem);
  });

});
