import type { ReactNode } from "react";
import { createElement } from "react";

import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, expectTypeOf, it } from "vitest";

import { Windows } from "../..";
import type { WindowDispatch, WindowDispatchEventMap } from "../../types";
import { useWindowDispatch } from "./index";

interface WrapperProps {
  children: ReactNode;
}

const Wrapper = ({ children }: WrapperProps) =>
  createElement(Windows, { children, windowsItems: [] });

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
