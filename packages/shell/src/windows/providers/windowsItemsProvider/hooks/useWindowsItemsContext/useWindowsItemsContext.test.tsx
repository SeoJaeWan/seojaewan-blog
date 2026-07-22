import type { PropsWithChildren } from "react";

import type { WindowItem } from "@window/ui";

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { WindowsItemsContext } from "../../context";
import { useWindowsItemsContext } from ".";

const WINDOWS_ITEMS = [{ id: "calculator", title: "계산기" }] satisfies readonly WindowItem[];

afterEach(cleanup);

describe("useWindowsItemsContext", () => {
  it("Provider가 제공한 WindowItem 목록을 그대로 반환한다", () => {
    const Wrapper = ({ children }: PropsWithChildren) => (
      <WindowsItemsContext.Provider value={WINDOWS_ITEMS}>{children}</WindowsItemsContext.Provider>
    );

    const { result } = renderHook(() => useWindowsItemsContext(), { wrapper: Wrapper });

    expect(result.current).toBe(WINDOWS_ITEMS);
  });

  it("Provider 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowsItemsContext())).toThrow(
      "useWindowsItemsContext는 WindowsItemsProvider 안에서 사용해야 합니다.",
    );
  });
});
