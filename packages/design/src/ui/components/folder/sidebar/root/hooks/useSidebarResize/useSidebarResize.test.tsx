import { act, cleanup, fireEvent, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useSidebarResize } from "./index.js";

afterEach(cleanup);

describe("useSidebarResize", () => {
  it("primary pointer 이동을 최소·최대 폭 안으로 제한한다", () => {
    const onWidthChange = vi.fn();
    const owner = document.createElement("div");
    document.body.append(owner);
    const hook = renderHook(() =>
      useSidebarResize({ width: 240, minimumWidth: 180, maximumWidth: 320, onWidthChange }),
    );

    act(() =>
      hook.result.current({
        button: 0,
        clientX: 100,
        currentTarget: owner,
        isPrimary: true,
        preventDefault: vi.fn(),
      } as never),
    );
    fireEvent.pointerMove(document, { clientX: 20 });
    fireEvent.pointerMove(document, { clientX: 300 });

    expect(onWidthChange).toHaveBeenNthCalledWith(1, 180);
    expect(onWidthChange).toHaveBeenNthCalledWith(2, 320);
  });

  it("비 primary 입력은 무시하고 pointer 종료와 unmount에서 listener를 정리한다", () => {
    const onWidthChange = vi.fn();
    const remove = vi.spyOn(document, "removeEventListener");
    const owner = document.createElement("div");
    document.body.append(owner);
    const hook = renderHook(() =>
      useSidebarResize({ width: 240, minimumWidth: 180, maximumWidth: 320, onWidthChange }),
    );

    act(() =>
      hook.result.current({
        button: 1,
        currentTarget: owner,
        isPrimary: true,
      } as never),
    );
    expect(onWidthChange).not.toHaveBeenCalled();

    act(() =>
      hook.result.current({
        button: 0,
        clientX: 100,
        currentTarget: owner,
        isPrimary: true,
        preventDefault: vi.fn(),
      } as never),
    );
    fireEvent.pointerUp(document);
    hook.unmount();

    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(remove).toHaveBeenCalledWith("pointercancel", expect.any(Function));
  });
});
