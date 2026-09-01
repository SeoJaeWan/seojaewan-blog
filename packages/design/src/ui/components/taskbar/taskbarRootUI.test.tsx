import { createRef } from "react";

import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../testing";
import { TaskbarItemUI, TaskbarPreviewUI, TaskbarRootUI, WindowPanelUI } from "./index";

afterEach(() => {
  cleanupUITest();
});

describe("TaskbarRootUI", () => {
  it("native nav props, slot과 ref를 50px surface root에 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <TaskbarRootUI
        aria-label="작업 표시줄"
        className="custom-root"
        data-layout="center"
        ref={ref}
      >
        <span>항목 slot</span>
      </TaskbarRootUI>,
    );
    const root = view.getByRole("navigation", { name: "작업 표시줄" });

    expect(root.tagName).toBe("NAV");
    expect(root.className).toContain("wd-taskbar-root-ui");
    expect(root.className).toContain("custom-root");
    expect(root.getAttribute("data-layout")).toBe("center");
    expect(root.textContent).toBe("항목 slot");
    expect(ref.current).toBe(root);
  });
});

describe("TaskbarItemUI", () => {
  it("icon을 장식으로 유지하고 필수 label을 native button 이름으로 사용한다", () => {
    const view = renderUITest(<TaskbarItemUI icon={<span>앱</span>} label="블로그 열기" />);
    const button = view.getByRole("button", { name: "블로그 열기" });

    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.getAttribute("data-state")).toBe("idle");
    expect(button.querySelector("[aria-hidden='true']")?.textContent).toBe("앱");
  });

  it("idle, running, active를 finite data state와 indicator로 표현한다", () => {
    const view = renderUITest(
      <>
        <TaskbarItemUI icon="I" label="대기" />
        <TaskbarItemUI icon="R" label="실행 중" state="running" />
        <TaskbarItemUI icon="A" label="활성" state="active" />
      </>,
    );
    const idle = view.getByRole("button", { name: "대기" });
    const running = view.getByRole("button", { name: "실행 중" });
    const active = view.getByRole("button", { name: "활성" });

    expect(idle.querySelector(".wd-taskbar-item-ui__indicator")).toBeNull();
    expect(running.querySelector(".wd-taskbar-item-ui__indicator")).not.toBeNull();
    expect(active.querySelector(".wd-taskbar-item-ui__indicator")).not.toBeNull();
    expect(running.hasAttribute("aria-pressed")).toBe(false);
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });

  it("native click 뒤 ID 없는 단일 activate action을 전달한다", () => {
    const onAction = vi.fn();
    const onClick = vi.fn();
    const view = renderUITest(
      <TaskbarItemUI
        data-presentation="taskbar-item"
        icon="A"
        label="앱 활성화"
        onAction={onAction}
        onClick={onClick}
      />,
    );
    const button = view.getByRole("button", { name: "앱 활성화" });

    button.click();

    expect(button.getAttribute("data-presentation")).toBe("taskbar-item");
    expect(onClick).toHaveBeenCalledOnce();
    expect(onAction).toHaveBeenCalledExactlyOnceWith({ type: "activate" });
  });

  it("native click이 취소되면 표현 action도 실행하지 않는다", () => {
    const onAction = vi.fn();
    const view = renderUITest(
      <TaskbarItemUI
        icon="A"
        label="취소 가능한 활성화"
        onAction={onAction}
        onClick={(event) => event.preventDefault()}
      />,
    );

    view.getByRole("button", { name: "취소 가능한 활성화" }).click();

    expect(onAction).not.toHaveBeenCalled();
  });

  it("disabled item은 native click과 표현 action을 모두 실행하지 않는다", () => {
    const onAction = vi.fn();
    const onClick = vi.fn();
    const view = renderUITest(
      <TaskbarItemUI
        disabled
        icon="D"
        label="사용할 수 없는 앱"
        onAction={onAction}
        onClick={onClick}
      />,
    );
    const button = view.getByRole("button", { name: "사용할 수 없는 앱" });

    button.click();

    expect(button.hasAttribute("disabled")).toBe(true);
    expect(onClick).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it("className, 명시한 type과 ref를 native button에 전달한다", () => {
    const ref = createRef<HTMLButtonElement>();
    const view = renderUITest(
      <TaskbarItemUI
        className="custom-item"
        icon="S"
        label="제출"
        name="intent"
        ref={ref}
        type="submit"
      />,
    );
    const button = view.getByRole("button", { name: "제출" });

    expect(button.className).toContain("custom-item");
    expect(button.getAttribute("name")).toBe("intent");
    expect(button.getAttribute("type")).toBe("submit");
    expect(ref.current).toBe(button);
  });
});

describe("TaskbarPreviewUI", () => {
  it("Window family 없이 generic preview slot과 native section props를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <TaskbarPreviewUI
        aria-label="블로그 미리 보기"
        className="custom-preview"
        data-kind="generic"
        preview={<article>generic preview</article>}
        ref={ref}
      />,
    );
    const preview = view.getByRole("region", { name: "블로그 미리 보기" });

    expect(preview.getAttribute("data-state")).toBe("visible");
    expect(preview.getAttribute("data-motion")).toBe("full");
    expect(preview.getAttribute("data-kind")).toBe("generic");
    expect(preview.textContent).toBe("generic preview");
    expect(ref.current).toBe(preview);
  });

  it("hidden 표시 상태는 native hidden semantic을 파생한다", () => {
    const view = renderUITest(
      <TaskbarPreviewUI data-testid="hidden-preview" preview="미리 보기" state="hidden" />,
    );
    const preview = view.getByTestId("hidden-preview");

    expect(preview.getAttribute("data-state")).toBe("hidden");
    expect(preview.hasAttribute("hidden")).toBe(true);
  });
});

describe("WindowPanelUI", () => {
  it("content slot, native props와 caller-owned transition state를 전달한다", () => {
    const ref = createRef<HTMLElement>();
    const view = renderUITest(
      <WindowPanelUI
        aria-label="시작"
        className="custom-panel"
        data-view="pinned"
        ref={ref}
        role="dialog"
        state="entering"
      >
        <div>고정된 항목 slot</div>
      </WindowPanelUI>,
    );
    const panel = view.getByRole("dialog", { name: "시작" });

    expect(panel.getAttribute("data-state")).toBe("entering");
    expect(panel.getAttribute("data-motion")).toBe("full");
    expect(panel.getAttribute("data-view")).toBe("pinned");
    expect(panel.textContent).toBe("고정된 항목 slot");
    expect(ref.current).toBe(panel);
  });

  it("hidden 표시 상태는 native hidden semantic을 파생한다", () => {
    const view = renderUITest(
      <WindowPanelUI data-testid="hidden-panel" state="hidden">
        숨은 panel
      </WindowPanelUI>,
    );
    const panel = view.getByTestId("hidden-panel");

    expect(panel.getAttribute("data-state")).toBe("hidden");
    expect(panel.hasAttribute("hidden")).toBe(true);
  });
});
