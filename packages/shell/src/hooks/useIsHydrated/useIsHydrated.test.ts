import { createElement } from "react";
import type { Root } from "react-dom/client";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";

import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useIsHydrated } from "./index";

const HydrationProbe = () => createElement("span", { "data-hydrated": String(useIsHydrated()) });

describe("useIsHydrated", () => {
  it("클라이언트 전용 렌더에서는 true를 반환한다", () => {
    const { result } = renderHook(() => useIsHydrated());

    expect(result.current).toBe(true);
  });

  it("서버에서는 false를 반환하고 hydration 후 true로 전환한다", () => {
    const container = document.createElement("div");
    container.innerHTML = renderToString(createElement(HydrationProbe));
    document.body.append(container);

    expect(container.querySelector("span")?.getAttribute("data-hydrated")).toBe("false");

    let root: Root | null = null;

    try {
      act(() => {
        root = hydrateRoot(container, createElement(HydrationProbe));
      });

      expect(container.querySelector("span")?.getAttribute("data-hydrated")).toBe("true");
    } finally {
      act(() => {
        root?.unmount();
      });
      container.remove();
    }
  });
});
