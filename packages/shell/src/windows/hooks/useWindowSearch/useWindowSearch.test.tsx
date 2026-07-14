import type { ReactNode } from "react";
import { createElement } from "react";

import type { WindowItem } from "@window/ui";

import { cleanup, render, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";

import { Windows } from "../..";
import { useWindowSearch } from "./index";

const CALCULATOR = { id: "calculator", title: "계산기" } satisfies WindowItem;
const TERMINAL = { id: "terminal", title: "터미널" } satisfies WindowItem;
const INITIAL_ITEMS = [CALCULATOR] satisfies readonly WindowItem[];
const NEXT_ITEMS = [CALCULATOR, TERMINAL] satisfies readonly WindowItem[];

interface WrapperProps {
  children: ReactNode;
}

const Wrapper = ({ children }: WrapperProps) =>
  createElement(Windows, { children, windowsItems: INITIAL_ITEMS });

interface SearchProbeProps {
  onResults: (results: readonly WindowItem[]) => void;
  query: string;
}

const SearchProbe = ({ onResults, query }: SearchProbeProps) => {
  onResults(useWindowSearch(query));
  return null;
};

const createTree = (
  windowsItems: readonly WindowItem[],
  query: string,
  onResults: SearchProbeProps["onResults"],
) =>
  createElement(Windows, {
    children: createElement(SearchProbe, { onResults, query }),
    windowsItems,
  });

afterEach(cleanup);

describe("useWindowSearch", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowSearch("계산기"))).toThrow(
      "useWindowSearch는 Windows 안에서 사용해야 합니다.",
    );
  });

  it("공백 query에는 Provider의 windowsItems 참조를 그대로 반환한다", () => {
    const { result } = renderHook(() => useWindowSearch("  "), { wrapper: Wrapper });

    expect(result.current).toBe(INITIAL_ITEMS);
    expectTypeOf(result.current).toEqualTypeOf<readonly WindowItem[]>();
  });

  it("Windows의 windowsItems prop 참조가 변경되면 자동으로 다시 검색한다", () => {
    let latestResults: readonly WindowItem[] = [];
    const onResults = (results: readonly WindowItem[]) => {
      latestResults = results;
    };
    const { rerender } = render(createTree(INITIAL_ITEMS, "터미널", onResults));

    expect(latestResults).toEqual([]);

    rerender(createTree(NEXT_ITEMS, "터미널", onResults));

    expect(latestResults).toEqual([TERMINAL]);
    expect(latestResults[0]).toBe(TERMINAL);
  });
});
