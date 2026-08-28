import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuUI } from "../../menuUI";

afterEach(cleanupUITest);

describe("MenuUI 구조 part", () => {
  it("Root가 기본 열림 상태와 상태 변경 callback을 제공한다", () => {
    const onOpenChange = vi.fn();

    renderUITest(
      <MenuUI.Root defaultOpen onOpenChange={onOpenChange}>
        <MenuUI.Trigger>작업</MenuUI.Trigger>
        <MenuUI.Content aria-label="작업 메뉴">
          <MenuUI.Item>열기</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    expect(screen.getByRole("menu", { name: "작업 메뉴" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "열기" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("Trigger가 기본 button DOM·이름·prop·ref 계약을 제공한다", () => {
    const ref = createRef<HTMLButtonElement>();

    renderUITest(
      <MenuUI.Root>
        <MenuUI.Trigger className="custom-trigger" ref={ref} type="button">
          작업 열기
        </MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Item>열기</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    const trigger = screen.getByRole("button", { name: "작업 열기" });
    expect(trigger.tagName).toBe("BUTTON");
    expect(trigger.classList.contains("wd-menu-ui__trigger")).toBe(true);
    expect(trigger.classList.contains("custom-trigger")).toBe(true);
    expect(trigger.getAttribute("type")).toBe("button");
    expect(ref.current).toBe(trigger);
  });

  it("Content가 menu role·이름·DOM prop·ref 계약을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();

    renderUITest(
      <MenuUI.Root defaultOpen>
        <MenuUI.Trigger>작업</MenuUI.Trigger>
        <MenuUI.Content
          aria-label="명명된 작업"
          className="custom-content"
          data-testid="content"
          ref={ref}
        >
          <MenuUI.Item>열기</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    const content = screen.getByRole("menu", { name: "명명된 작업" });
    expect(content).toBe(screen.getByTestId("content"));
    expect(content.classList.contains("wd-menu-ui__content")).toBe(true);
    expect(content.classList.contains("custom-content")).toBe(true);
    expect(ref.current).toBe(content);
  });

  it("disabled Root는 Trigger를 눌러도 열리지 않는다", () => {
    const onOpenChange = vi.fn();

    renderUITest(
      <MenuUI.Root disabled onOpenChange={onOpenChange}>
        <MenuUI.Trigger>비활성 작업</MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Item>열기</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "비활성 작업" }));
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it("controlled Root는 요청을 보고하되 외부 open 값을 바꾸지 않는다", () => {
    const onOpenChange = vi.fn();

    renderUITest(
      <MenuUI.Root onOpenChange={onOpenChange} open={false}>
        <MenuUI.Trigger>제어 작업</MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Item>열기</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "제어 작업" }));
    expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" });
    expect(screen.queryByRole("menuitem", { name: "열기" })).toBeNull();
  });
});
