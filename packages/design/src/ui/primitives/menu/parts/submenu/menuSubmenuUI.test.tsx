import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuUI } from "../../menuUI";
import type { MenuUIOpenChangeHandler } from "../../menuUI.types";

afterEach(cleanupUITest);

const renderSubmenu = ({
  submenuDefaultOpen = false,
  onOpenChange,
}: {
  submenuDefaultOpen?: boolean;
  onOpenChange?: MenuUIOpenChangeHandler;
} = {}) =>
  renderUITest(
    <MenuUI.Root defaultOpen>
      <MenuUI.Trigger>작업</MenuUI.Trigger>
      <MenuUI.Content aria-label="작업 메뉴">
        <MenuUI.Submenu.Root defaultOpen={submenuDefaultOpen} onOpenChange={onOpenChange}>
          <MenuUI.Submenu.Trigger>공유</MenuUI.Submenu.Trigger>
          <MenuUI.Submenu.Content aria-label="공유 메뉴">
            <MenuUI.Item>메일</MenuUI.Item>
          </MenuUI.Submenu.Content>
        </MenuUI.Submenu.Root>
      </MenuUI.Content>
    </MenuUI.Root>,
  );

describe("MenuUI 중첩 part", () => {
  it("Submenu Root가 독립 기본 open state와 변경 callback을 제공한다", () => {
    const onOpenChange = vi.fn();
    renderSubmenu({ onOpenChange, submenuDefaultOpen: true });

    expect(screen.getByRole("menu", { name: "공유 메뉴" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "메일" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("Submenu Trigger가 menuitem role·이름·state·prop·ref 계약을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuUI.Root defaultOpen>
        <MenuUI.Trigger>작업</MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Submenu.Root>
            <MenuUI.Submenu.Trigger className="custom-submenu" ref={ref}>
              공유
            </MenuUI.Submenu.Trigger>
            <MenuUI.Submenu.Content>
              <MenuUI.Item>메일</MenuUI.Item>
            </MenuUI.Submenu.Content>
          </MenuUI.Submenu.Root>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    const trigger = screen.getByRole("menuitem", { name: "공유" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.classList.contains("custom-submenu")).toBe(true);
    expect(ref.current).toBe(trigger);
  });

  it("Submenu Content가 중첩 menu role·이름·DOM prop·ref 계약을 제공한다", () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <MenuUI.Root defaultOpen>
        <MenuUI.Trigger>작업</MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Submenu.Root defaultOpen>
            <MenuUI.Submenu.Trigger>공유</MenuUI.Submenu.Trigger>
            <MenuUI.Submenu.Content
              aria-label="명명된 공유 메뉴"
              className="custom-submenu-content"
              ref={ref}
            >
              <MenuUI.Item>메일</MenuUI.Item>
            </MenuUI.Submenu.Content>
          </MenuUI.Submenu.Root>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    const content = screen.getByRole("menu", { name: "명명된 공유 메뉴" });
    expect(content.classList.contains("custom-submenu-content")).toBe(true);
    expect(ref.current).toBe(content);
  });

  it("중첩 item 선택은 Submenu와 부모 Menu를 함께 닫는다", () => {
    const onRootOpenChange = vi.fn();
    const onSubmenuOpenChange = vi.fn();
    renderUITest(
      <MenuUI.Root defaultOpen onOpenChange={onRootOpenChange}>
        <MenuUI.Trigger>작업</MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Submenu.Root defaultOpen onOpenChange={onSubmenuOpenChange}>
            <MenuUI.Submenu.Trigger>공유</MenuUI.Submenu.Trigger>
            <MenuUI.Submenu.Content aria-label="공유 메뉴">
              <MenuUI.Item>메일</MenuUI.Item>
            </MenuUI.Submenu.Content>
          </MenuUI.Submenu.Root>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    fireEvent.click(screen.getByRole("menuitem", { name: "메일" }));
    expect(onSubmenuOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(onRootOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(screen.queryByRole("menu", { name: "공유 메뉴" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "공유" })).toBeNull();
  });
});
