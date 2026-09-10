import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useTaskbarResponsivePanelDismiss } from "./index.js";
afterEach(cleanup);
describe("useTaskbarResponsivePanelDismiss", () => {
  it("mobile 진입마다 한 번 요청하고 같은 mode와 callback 교체에는 반복하지 않는다", () => {
    const dismiss = vi.fn();
    const next = vi.fn();
    type Props = { mode: "desktop" | "mobile" | undefined; dismiss: () => void };
    const hook = renderHook<void, Props>(
      ({ mode, dismiss }: Props) => useTaskbarResponsivePanelDismiss(mode, dismiss),
      { initialProps: { mode: undefined, dismiss } },
    );
    hook.rerender({ mode: "desktop", dismiss });
    expect(dismiss).not.toHaveBeenCalled();
    hook.rerender({ mode: "mobile", dismiss });
    expect(dismiss).toHaveBeenCalledTimes(1);
    hook.rerender({ mode: "mobile", dismiss: next });
    expect(next).not.toHaveBeenCalled();
    hook.rerender({ mode: "desktop", dismiss: next });
    expect(next).not.toHaveBeenCalled();
    hook.rerender({ mode: "mobile", dismiss: next });
    expect(next).toHaveBeenCalledTimes(1);
  });
  it("최초 mobile 렌더에서도 정리를 요청한다", () => {
    const dismiss = vi.fn();
    renderHook(() => useTaskbarResponsivePanelDismiss("mobile", dismiss));
    expect(dismiss).toHaveBeenCalledTimes(1);
  });
});
