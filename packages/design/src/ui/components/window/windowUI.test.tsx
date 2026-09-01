import { createRef } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import {
  WindowControlsUI,
  type WindowControlUIEvent,
  WindowFrameUI,
  WindowTitleBarUI,
} from "./index";

afterEach(() => {
  cleanupUITest();
});

describe("WindowFrameUI", () => {
  it("display state, bounded geometry, slots와 native section props를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <WindowFrameUI
        activity="background"
        aria-label="문서 창"
        bounds={{ blockSize: 360, inlineSize: 640, insetBlockStart: 24, insetInlineStart: 32 }}
        className="document-window"
        data-surface="document"
        dragging
        fullscreen={false}
        motion="restoring"
        ref={ref}
        style={{ opacity: 0.9 }}
        titleBar={<WindowTitleBarUI titleContent="문서" />}
      >
        문서 내용
      </WindowFrameUI>,
    );
    const frame = view.getByRole("region", { name: "문서 창" });

    expect(frame.tagName).toBe("SECTION");
    expect(ref.current).toBe(frame);
    expect(frame.className).toContain("wd-window-frame-ui");
    expect(frame.className).toContain("document-window");
    expect(frame.getAttribute("data-surface")).toBe("document");
    expect(frame.getAttribute("data-activity")).toBe("background");
    expect(frame.getAttribute("data-dragging")).toBe("true");
    expect(frame.getAttribute("data-fullscreen")).toBe("false");
    expect(frame.getAttribute("data-motion")).toBe("restoring");
    expect(frame.style.getPropertyValue("--wd-window-frame-block-size")).toBe("360px");
    expect(frame.style.getPropertyValue("--wd-window-frame-inline-size")).toBe("640px");
    expect(frame.style.getPropertyValue("--wd-window-frame-inset-block-start")).toBe("24px");
    expect(frame.style.getPropertyValue("--wd-window-frame-inset-inline-start")).toBe("32px");
    expect(frame.style.opacity).toBe("0.9");
    expect(view.getByText("문서")).toBeTruthy();
    expect(view.getByText("문서 내용")).toBeTruthy();
  });

  it("기본 visual state를 명시적인 data attributes로 노출한다", () => {
    const view = renderUITest(<WindowFrameUI aria-label="기본 창" />);
    const frame = view.getByRole("region", { name: "기본 창" });

    expect(frame.getAttribute("data-activity")).toBe("active");
    expect(frame.getAttribute("data-dragging")).toBe("false");
    expect(frame.getAttribute("data-fullscreen")).toBe("false");
    expect(frame.getAttribute("data-motion")).toBe("idle");
  });
});

describe("WindowTitleBarUI", () => {
  it("slots, ref와 native header events를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const onDoubleClick = vi.fn();
    const onPointerDown = vi.fn();
    const view = renderUITest(
      <WindowTitleBarUI
        className="document-titlebar"
        controls={<span>창 제어</span>}
        data-drag-handle="true"
        leading="앱"
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        ref={ref}
        titleContent="문서"
      />,
    );
    const titlebar = view.getByText("문서").closest("header");

    expect(titlebar).not.toBeNull();
    expect(ref.current).toBe(titlebar);
    expect(titlebar?.className).toContain("document-titlebar");
    expect(titlebar?.getAttribute("data-drag-handle")).toBe("true");
    expect(view.getByText("앱").getAttribute("aria-hidden")).toBe("true");
    expect(view.getByText("창 제어")).toBeTruthy();

    titlebar?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    titlebar?.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));

    expect(onPointerDown).toHaveBeenCalledOnce();
    expect(onDoubleClick).toHaveBeenCalledOnce();
  });
});

describe("WindowControlsUI", () => {
  it("icon-only controls에 accessible names를 제공하고 ID-free event 하나를 emit한다", () => {
    const events: WindowControlUIEvent[] = [];
    const onControl = vi.fn((event: WindowControlUIEvent) => events.push(event));
    const view = renderUITest(<WindowControlsUI onControl={onControl} />);

    view.getByRole("button", { name: "최소화" }).click();
    view.getByRole("button", { name: "최대화" }).click();
    view.getByRole("button", { name: "닫기" }).click();

    expect(events).toEqual([
      { control: "minimize" },
      { control: "maximize" },
      { control: "close" },
    ]);
    expect(Object.keys(events[0] ?? {})).toEqual(["control"]);
  });

  it("fullscreen에서는 restore accessible name과 payload를 사용한다", () => {
    const onControl = vi.fn();
    const view = renderUITest(<WindowControlsUI fullscreen onControl={onControl} />);
    const restore = view.getByRole("button", { name: "이전 크기로 복원" });

    expect(restore.getAttribute("data-control")).toBe("restore");
    restore.click();
    expect(onControl).toHaveBeenCalledWith({ control: "restore" });
  });

  it("전체 또는 개별 disabled control은 event를 emit하지 않는다", () => {
    const onControl = vi.fn();
    const view = renderUITest(
      <WindowControlsUI disabledControls={["minimize", "close"]} onControl={onControl} />,
    );
    const minimize = view.getByRole("button", { name: "최소화" });
    const maximize = view.getByRole("button", { name: "최대화" });
    const close = view.getByRole("button", { name: "닫기" });

    expect(minimize.hasAttribute("disabled")).toBe(true);
    expect(close.hasAttribute("disabled")).toBe(true);
    minimize.click();
    close.click();
    expect(onControl).not.toHaveBeenCalled();

    maximize.click();
    expect(onControl).toHaveBeenCalledOnce();
    expect(onControl).toHaveBeenCalledWith({ control: "maximize" });
  });

  it("root native props와 ref를 전달하고 pointer down 전파를 차단한다", () => {
    const ref = createRef<HTMLDivElement>();
    const onParentPointerDown = vi.fn();
    const onPointerDown = vi.fn();
    const view = renderUITest(
      <div onPointerDown={onParentPointerDown}>
        <WindowControlsUI
          aria-label="창 제어"
          className="document-controls"
          data-layout="compact"
          onPointerDown={onPointerDown}
          ref={ref}
        />
      </div>,
    );
    const controls = view.getByLabelText("창 제어");

    controls.dispatchEvent(new Event("pointerdown", { bubbles: true }));

    expect(ref.current).toBe(controls);
    expect(controls.className).toContain("document-controls");
    expect(controls.getAttribute("data-layout")).toBe("compact");
    expect(onPointerDown).toHaveBeenCalledOnce();
    expect(onParentPointerDown).not.toHaveBeenCalled();
  });
});
