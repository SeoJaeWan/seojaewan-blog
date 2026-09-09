import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WindowControls, WindowFrame, WindowTitleBar } from "./index.js";

afterEach(() => cleanup());

describe("Common Window frame", () => {
  it("controlled frame 상태와 content slot, desktop resize 방향을 최종 DOM에 투영한다", () => {
    const onResizeStart = vi.fn();

    const { container } = render(
      <WindowFrame
        active={false}
        aria-label="Chrome 창"
        bounds={{ height: 500, left: 48, top: 36, width: 840 }}
        maximized={false}
        mode="desktop"
        onResizeStart={onResizeStart}
        titleBar={
          <WindowTitleBar controls={<WindowControls maximized={false} mode="desktop" />}>
            Chrome
          </WindowTitleBar>
        }
        variant="chrome"
        zIndex={7}
      >
        <input aria-label="주소" defaultValue="https://example.com" />
      </WindowFrame>,
    );

    const frame = screen.getByRole("region", { name: "Chrome 창" });
    expect(frame.getAttribute("data-active")).toBe("false");
    expect(frame.getAttribute("data-maximized")).toBe("false");
    expect(frame.getAttribute("data-mode")).toBe("desktop");
    expect(frame.getAttribute("data-variant")).toBe("chrome");
    expect(frame.getAttribute("style")).toContain("--wd-window-frame-runtime-width: 840px");
    expect(frame.getAttribute("style")).toContain("z-index: 7");
    expect(screen.getByRole<HTMLInputElement>("textbox", { name: "주소" }).value).toBe(
      "https://example.com",
    );

    const handles = container.querySelectorAll<HTMLButtonElement>(".window-resize-handle");
    expect(handles).toHaveLength(8);
    fireEvent.pointerDown(handles[7]);
    expect(onResizeStart).toHaveBeenCalledWith(expect.anything(), "se");
  });

  it("mobile에서는 닫기만 제공하고 resize handle을 렌더링하지 않는다", () => {
    const onClose = vi.fn();

    const { container } = render(
      <WindowFrame
        active
        aria-label="파일 탐색기 창"
        bounds={{ height: 500, left: 48, top: 36, width: 840 }}
        maximized={false}
        mode="mobile"
        titleBar={
          <WindowTitleBar
            controls={<WindowControls maximized={false} mode="mobile" onClose={onClose} />}
          >
            파일 탐색기
          </WindowTitleBar>
        }
        variant="file-explorer"
      >
        content
      </WindowFrame>,
    );

    expect(within(container).queryByRole("button", { name: "최소화" })).toBeNull();
    expect(within(container).queryByRole("button", { name: "최대화" })).toBeNull();
    expect(container.querySelectorAll(".window-resize-handle")).toHaveLength(0);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
