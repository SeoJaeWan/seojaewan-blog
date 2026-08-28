import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuUI } from "../../contextMenuUI";

afterEach(cleanupUITest);

describe("ContextMenuUI 구조 part", () => {
  it("Root가 호출로 연 상태와 project callback을 제공한다", async () => {
    const onOpenChange = vi.fn();
    renderUITest(
      <ContextMenuUI.Root onOpenChange={onOpenChange}>
        <ContextMenuUI.Trigger>문서</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="문서 메뉴">
          <ContextMenuUI.Item>열기</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("문서"), { clientX: 12, clientY: 16 });
    expect(await screen.findByRole("menu", { name: "문서 메뉴" })).toBeTruthy();
    expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" });
  });

  it("Trigger가 surface DOM·이름·prop·ref 계약을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger className="custom-trigger" data-testid="surface" ref={ref}>
          문서 surface
        </ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Item>열기</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    const trigger = screen.getByText("문서 surface");
    expect(trigger.tagName).toBe("DIV");
    expect(trigger).toBe(screen.getByTestId("surface"));
    expect(trigger.classList.contains("wd-context-menu-ui__trigger")).toBe(true);
    expect(trigger.classList.contains("custom-trigger")).toBe(true);
    expect(ref.current).toBe(trigger);
  });

  it("Content가 menu role·이름·DOM prop·ref 계약을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>문서</ContextMenuUI.Trigger>
        <ContextMenuUI.Content
          aria-label="명명된 문서 메뉴"
          className="custom-content"
          data-testid="content"
          ref={ref}
        >
          <ContextMenuUI.Item>열기</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("문서"));
    const content = await screen.findByRole("menu", { name: "명명된 문서 메뉴" });
    expect(content).toBe(screen.getByTestId("content"));
    expect(content.classList.contains("custom-content")).toBe(true);
    expect(ref.current).toBe(content);
  });

  it("disabled Root는 context 호출에도 열리지 않는다", () => {
    const onOpenChange = vi.fn();
    renderUITest(
      <ContextMenuUI.Root disabled onOpenChange={onOpenChange}>
        <ContextMenuUI.Trigger>비활성 문서</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Item>열기</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("비활성 문서"));
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("controlled Root는 요청을 보고하되 외부 open 값을 바꾸지 않는다", () => {
    const onOpenChange = vi.fn();
    renderUITest(
      <ContextMenuUI.Root onOpenChange={onOpenChange} open={false}>
        <ContextMenuUI.Trigger>제어 문서</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Item>열기</ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("제어 문서"));
    expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" });
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
  });
});
