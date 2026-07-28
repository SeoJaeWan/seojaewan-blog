import type { PropsWithChildren } from "react";

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WindowsEventsContext } from "../../context";
import type {
  DispatchWindowEvent,
  SubscribeWindowEvent,
  WindowsEventsContextValue,
} from "../../types";
import { useWindowsEventsContext } from "./";

afterEach(cleanup);

describe("useWindowsEventsContext", () => {
  it("Provider가 제공한 event dispatch와 subscribe를 그대로 반환한다", () => {
    const subscribe: SubscribeWindowEvent = () => () => undefined;
    const value: WindowsEventsContextValue = {
      dispatch: vi.fn<DispatchWindowEvent>(),
      subscribe,
    };
    const Wrapper = ({ children }: PropsWithChildren) => (
      <WindowsEventsContext.Provider value={value}>{children}</WindowsEventsContext.Provider>
    );

    const { result } = renderHook(() => useWindowsEventsContext(), { wrapper: Wrapper });

    expect(result.current).toBe(value);
  });

  it("Provider 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowsEventsContext())).toThrow(
      "useWindowsEventsContext는 WindowsEventsProvider 안에서 사용해야 합니다.",
    );
  });
});
