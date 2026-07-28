import type { PropsWithChildren } from "react";

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TaskbarPinsContext } from "../../context";
import type { UseTaskbarPins } from "../../types";
import { useTaskbarPins } from "./";

describe("useTaskbarPins", () => {
  it("Provider가 제공한 Taskbar pin state와 action을 그대로 반환한다", () => {
    const value: UseTaskbarPins = {
      isPinned: vi.fn((itemId) => itemId === "calculator"),
      pin: vi.fn(),
      pinnedIds: ["calculator"],
      unpin: vi.fn(),
    };
    const Wrapper = ({ children }: PropsWithChildren) => (
      <TaskbarPinsContext.Provider value={value}>{children}</TaskbarPinsContext.Provider>
    );

    const { result } = renderHook(() => useTaskbarPins(), { wrapper: Wrapper });

    expect(result.current).toBe(value);
  });

  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useTaskbarPins())).toThrow(
      "useTaskbarPins는 Windows 안에서 사용해야 합니다.",
    );
  });
});
