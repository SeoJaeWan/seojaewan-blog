import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { MenuUI } from "../../menuUI";

afterEach(cleanupUITest);

describe("MenuUI 중첩 조합", () => {
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
