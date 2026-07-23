import type { PropsWithChildren } from "react";

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { WindowsPinsContext } from "../../context";
import type { WindowsPinsContextValue } from "../../types";
import { useWindowsPins } from ".";

describe("useWindowsPins", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowsPins())).toThrow(
      "useWindowsPins는 Windows 안에서 사용해야 합니다.",
    );
  });

  it("Provider가 제공한 Windows pin state와 action을 그대로 반환한다", () => {
    const value: WindowsPinsContextValue = {
      isPinned: vi.fn((itemId) => itemId === "calculator"),
      mutation: null,
      pin: vi.fn(),
      pinnedIds: ["calculator"],
      reorder: vi.fn(),
      unpin: vi.fn(),
    };
    const Wrapper = ({ children }: PropsWithChildren) => (
      <WindowsPinsContext.Provider value={value}>{children}</WindowsPinsContext.Provider>
    );

    const { result } = renderHook(() => useWindowsPins(), { wrapper: Wrapper });

    expect(result.current).toBe(value);
  });
});
