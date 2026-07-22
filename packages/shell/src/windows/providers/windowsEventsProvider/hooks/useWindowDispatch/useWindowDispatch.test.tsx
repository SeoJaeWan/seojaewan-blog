import type { PropsWithChildren } from "react";

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";

import type { WindowDispatch, WindowDispatchEventMap } from "../../../../types";
import { WindowsEventsProvider } from "../..";
import { useWindowDispatch } from ".";

const Wrapper = ({ children }: PropsWithChildren) => (
  <WindowsEventsProvider>{children}</WindowsEventsProvider>
);

afterEach(cleanup);

describe("useWindowDispatch", () => {
  it("Windows 밖에서 호출하면 사용 위치 오류를 발생시킨다", () => {
    expect(() => renderHook(() => useWindowDispatch())).toThrow(
      "useWindowDispatch는 Windows 안에서 사용해야 합니다.",
    );
  });

  it("상태 없는 event map만 허용하는 dispatch를 반환한다", () => {
    const { result } = renderHook(() => useWindowDispatch(), { wrapper: Wrapper });

    expect(result.current).toBeTypeOf("function");
    expectTypeOf(result.current).toEqualTypeOf<WindowDispatch>();
    expectTypeOf<keyof WindowDispatchEventMap>().toEqualTypeOf<
      "windowContextMenuRequested" | "windowOpen" | "windowOpenLocation"
    >();
  });
});
