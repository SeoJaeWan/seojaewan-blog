import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskbarPanelInteraction } from "./index.js";
afterEach(() => {
  cleanup();
  document.body.replaceChildren();
});
describe("useTaskbarPanelInteraction", () => {
  it.each([
    ["escape-key", "escape"],
    ["focus-out", "focus-out"],
    ["outside-press", "outside"],
    ["trigger-focus", "trigger"],
    ["trigger-press", "trigger"],
    ["other", "unknown"],
  ])("%s 원인을 %s 요청으로 변환한다", (reason, expected) => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useTaskbarPanelInteraction({ open: true, variant: "start", onOpenChange }),
    );
    result.current.handleOpenChange(false, { reason } as Parameters<
      typeof result.current.handleOpenChange
    >[1]);
    expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(false, expected);
  });
  it.each(["start", "search"] as const)("%s Escape의 focus 정책을 적용한다", (variant) => {
    const input = document.createElement("input");
    document.body.append(input);
    input.focus();
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useTaskbarPanelInteraction({ open: true, variant, onOpenChange }),
    );
    result.current.handleOpenChange(false, { reason: "escape-key" } as Parameters<
      typeof result.current.handleOpenChange
    >[1]);
    expect(document.activeElement === input).toBe(variant === "start");
  });
  it.each([
    { variant: "search" as const, open: false, count: 1 },
    { variant: "search" as const, open: true, count: 0 },
    { variant: "start" as const, open: false, count: 0 },
  ])("$variant open=$open focus의 열기 요청 횟수를 지킨다", ({ variant, open, count }) => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() =>
      useTaskbarPanelInteraction({ variant, open, onOpenChange }),
    );
    result.current.handleTriggerFocus();
    expect(onOpenChange).toHaveBeenCalledTimes(count);
    if (count) expect(onOpenChange).toHaveBeenCalledWith(true, "trigger");
  });
  it.each(["start", "search"] as const)("%s click의 Base UI toggle 정책을 지킨다", (variant) => {
    const preventBaseUIHandler = vi.fn();
    const { result } = renderHook(() =>
      useTaskbarPanelInteraction({ open: true, variant, onOpenChange: vi.fn() }),
    );
    result.current.handleTriggerClick({ preventBaseUIHandler } as unknown as Parameters<
      typeof result.current.handleTriggerClick
    >[0]);
    expect(preventBaseUIHandler).toHaveBeenCalledTimes(variant === "search" ? 1 : 0);
  });
});
