import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskbarPanelAnchor } from "./index.js";
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
describe("useTaskbarPanelAnchor", () => {
  it("trigger가 연결되지 않으면 anchor를 제공하지 않는다", () => {
    const { result } = renderHook(() => useTaskbarPanelAnchor("start"));
    expect(result.current.resolveAnchor()).toBeNull();
  });
  it("Taskbar 상단을 측정하고 다음 요청에 갱신된 bounds를 사용한다", () => {
    const nav = document.createElement("nav");
    nav.className = "taskbar-root";
    const trigger = document.createElement("button");
    nav.append(trigger);
    document.body.append(nav);
    vi.spyOn(nav, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 670, 1280, 50));
    const measure = vi
      .spyOn(trigger, "getBoundingClientRect")
      .mockReturnValue(new DOMRect(450, 685, 220, 30));
    const { result } = renderHook(() => useTaskbarPanelAnchor("search"));
    result.current.triggerRef.current = trigger;
    const anchor = result.current.resolveAnchor();
    expect(anchor?.contextElement).toBe(trigger);
    expect(anchor?.getBoundingClientRect()).toMatchObject({
      x: 450,
      y: 670,
      width: 220,
      height: 0,
    });
    measure.mockReturnValue(new DOMRect(460, 685, 180, 30));
    expect(result.current.resolveAnchor()?.getBoundingClientRect()).toMatchObject({
      x: 460,
      width: 180,
    });
  });
  it("Taskbar 밖에서는 trigger 상단을 쓰고 variant 변경을 반영한다", () => {
    const trigger = document.createElement("button");
    vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(100, 500, 40, 40));
    const hook = renderHook(
      ({ variant }: { variant: "start" | "search" }) => useTaskbarPanelAnchor(variant),
      { initialProps: { variant: "start" } },
    );
    hook.result.current.triggerRef.current = trigger;
    expect(hook.result.current.resolveAnchor()?.getBoundingClientRect()).toMatchObject({
      x: window.innerWidth / 2,
      y: 500,
      width: 0,
    });
    hook.rerender({ variant: "search" });
    expect(hook.result.current.resolveAnchor()?.getBoundingClientRect()).toMatchObject({
      x: 100,
      y: 500,
      width: 40,
    });
  });
});
