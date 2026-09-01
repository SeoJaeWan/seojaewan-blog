import { createRef } from "react";

import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import {
  FileViewportUI,
  FileWindowUI,
  RouteInputUI,
  TagInputUI,
  WindowControlsUI,
  type WindowControlUIEvent,
  WindowFrameUI,
  WindowRouteBarUI,
  WindowTabUI,
  WindowTitleBarUI,
} from "./index";
import { WindowResizeHandlesUI } from "./windowResizeHandlesUI";

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
    expect(frame.getAttribute("data-gesture")).toBe("none");
    expect(frame.getAttribute("data-motion")).toBe("idle");
    expect(frame.getAttribute("data-resizable")).toBe("false");
    expect(frame.getAttribute("data-variant")).toBe("folder");
  });

  it("family-local resize handles가 ID 없이 시작 방향을 보고한다", () => {
    const onResizeStart = vi.fn();
    const view = renderUITest(
      <WindowFrameUI aria-label="크기 조절 창" onResizeStart={onResizeStart} resizable />,
    );
    const frame = view.getByRole("region", { name: "크기 조절 창" });
    const southeastHandle = frame.querySelector('[data-direction="se"]');

    expect(frame.getAttribute("data-resizable")).toBe("true");
    expect(frame.querySelectorAll(".wd-window-resize-handles-ui__handle")).toHaveLength(8);
    southeastHandle?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(onResizeStart).toHaveBeenCalledWith({ direction: "se" });
  });
});

describe("FileViewportUI", () => {
  it("Application content를 selectable scroll viewport에 그대로 렌더한다", () => {
    const ref = createRef<HTMLDivElement>();
    const view = renderUITest(
      <FileViewportUI aria-label="파일 본문" className="document-body" ref={ref}>
        <article>Application 문서</article>
      </FileViewportUI>,
    );
    const viewport = view.getByLabelText("파일 본문");

    expect(ref.current).toBe(viewport);
    expect(viewport.className).toContain("wd-file-viewport-ui");
    expect(viewport.className).toContain("document-body");
    expect(viewport.getAttribute("data-loading")).toBe("false");
    expect(viewport.getAttribute("aria-busy")).toBe("false");
    expect(view.getByRole("article").textContent).toBe("Application 문서");
  });

  it("loading 중에는 content 대신 접근 가능한 progress visual을 표시한다", () => {
    const view = renderUITest(
      <FileViewportUI loading loadingLabel="문서 준비 중">
        <article>아직 표시하지 않음</article>
      </FileViewportUI>,
    );

    expect(view.getByRole("status", { name: "문서 준비 중" })).toBeTruthy();
    expect(view.queryByRole("article")).toBeNull();
  });
});

describe("FileWindowUI", () => {
  it("Folder와 다른 File chrome과 유일한 content slot을 완성해 제공한다", () => {
    const view = renderUITest(
      <FileWindowUI
        aria-label="문서 창"
        routeBarProps={{ "aria-label": "문서 경로" }}
        routeInputProps={{
          label: "현재 문서",
          options: [{ label: "소개", value: "intro" }],
        }}
        title="소개"
        viewportProps={{ "aria-label": "문서 내용" }}
      >
        <article>Application renderer</article>
      </FileWindowUI>,
    );
    const frame = view.getByRole("region", { name: "문서 창" });

    expect(frame.getAttribute("data-variant")).toBe("file");
    expect(view.getByText("소개")).toBeTruthy();
    expect(view.getByRole("navigation", { name: "문서 경로" })).toBeTruthy();
    expect(
      view
        .getByRole("combobox", { name: "현재 문서" })
        .closest(".wd-route-input-ui")
        ?.getAttribute("data-shape"),
    ).toBe("pill");
    expect(view.getByLabelText("문서 내용").contains(view.getByRole("article"))).toBe(true);
    expect(frame.querySelector(".wd-tag-input-ui")).toBeNull();
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

    expect(view.getByRole("button", { name: "최소화" }).className).toContain("wd-icon-button-ui");

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

describe("WindowTabUI", () => {
  it("icon, 긴 title, ref와 native div props를 실제 tab role에 전달한다", () => {
    const ref = createRef<HTMLDivElement>();
    const view = renderUITest(
      <WindowTabUI data-kind="folder" icon="폴더" ref={ref} titleContent="디자인 문서" />,
    );
    const tab = view.getByText("디자인 문서").closest("div");

    expect(ref.current).toBe(tab);
    expect(tab?.className).toContain("wd-window-tab-ui");
    expect(tab?.getAttribute("data-kind")).toBe("folder");
    expect(view.getByText("폴더").getAttribute("aria-hidden")).toBe("true");
  });
});

describe("WindowRouteBarUI", () => {
  it("IconButtonUI history actions와 field slots를 조합해 방향만 보고한다", () => {
    const onNavigate = vi.fn();
    const view = renderUITest(
      <WindowRouteBarUI
        aria-label="경로 도구"
        forwardDisabled
        onNavigate={onNavigate}
        tagInput={<span>태그 필드</span>}
      >
        <span>경로 필드</span>
      </WindowRouteBarUI>,
    );
    const back = view.getByRole("button", { name: "뒤로" });
    const forward = view.getByRole("button", { name: "앞으로" });

    expect(back.className).toContain("wd-icon-button-ui");
    expect(forward.hasAttribute("disabled")).toBe(true);
    expect(view.getByText("경로 필드")).toBeTruthy();
    expect(view.getByText("태그 필드")).toBeTruthy();
    back.click();
    forward.click();
    expect(onNavigate).toHaveBeenCalledOnce();
    expect(onNavigate).toHaveBeenCalledWith({ direction: "back" });
  });
});

describe("RouteInputUI", () => {
  it("ComboboxUI를 route suggestion field로 조합하고 native div props를 보존한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <RouteInputUI
        data-surface="route"
        defaultOpen
        label="현재 경로"
        options={[{ label: "프로젝트", value: "projects" }]}
        ref={ref}
      />,
    );

    expect(ref.current?.className).toContain("wd-route-input-ui");
    expect(ref.current?.getAttribute("data-surface")).toBe("route");
    expect(screen.getByRole("combobox", { name: "현재 경로" })).toBeTruthy();
    expect(screen.getByRole("option", { name: "프로젝트" })).toBeTruthy();
    expect(document.querySelector('[aria-label="경로 후보 보기"]')).toBeTruthy();
  });
});

describe("TagInputUI", () => {
  it("SelectUI를 tag selection field로 조합하고 project-owned option을 표시한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <TagInputUI
        data-surface="tag"
        defaultOpen
        defaultValue="design"
        label="태그 필터"
        options={[{ label: "디자인", value: "design" }]}
        ref={ref}
      />,
    );
    const trigger = screen.getByRole("combobox", { name: "태그 필터" });

    expect(ref.current?.className).toContain("wd-tag-input-ui");
    expect(ref.current?.getAttribute("data-surface")).toBe("tag");
    expect(trigger.className).toContain("wd-select-ui__trigger");
    expect(screen.getByRole("option", { name: "디자인" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "태그 선택 지우기" })).toBeTruthy();
  });
});

describe("WindowResizeHandlesUI", () => {
  it("disabled 상태에서도 여덟 방향 geometry를 유지하고 pointer event를 막는다", () => {
    const onResizeStart = vi.fn();
    const view = renderUITest(
      <WindowResizeHandlesUI data-testid="resize-handles" disabled onResizeStart={onResizeStart} />,
    );
    const handles = view.getByTestId("resize-handles");

    expect(handles.getAttribute("data-disabled")).toBe("true");
    expect(handles.querySelectorAll("[data-direction]")).toHaveLength(8);
    handles
      .querySelector('[data-direction="n"]')
      ?.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(onResizeStart).not.toHaveBeenCalled();
  });
});
