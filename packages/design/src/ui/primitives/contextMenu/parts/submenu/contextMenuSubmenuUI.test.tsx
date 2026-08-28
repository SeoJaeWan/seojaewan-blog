import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuUI } from "../../contextMenuUI";

afterEach(cleanupUITest);

describe("ContextMenuUI 중첩 조합", () => {
  it("중첩 item 선택은 Submenu와 부모 ContextMenu를 함께 닫는다", async () => {
    const onRootOpenChange = vi.fn();
    const onSubmenuOpenChange = vi.fn();
    renderUITest(
      <ContextMenuUI.Root onOpenChange={onRootOpenChange}>
        <ContextMenuUI.Trigger>작업 surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Submenu.Root defaultOpen onOpenChange={onSubmenuOpenChange}>
            <ContextMenuUI.Submenu.Trigger>공유</ContextMenuUI.Submenu.Trigger>
            <ContextMenuUI.Submenu.Content aria-label="공유 메뉴">
              <ContextMenuUI.Item>메일</ContextMenuUI.Item>
            </ContextMenuUI.Submenu.Content>
          </ContextMenuUI.Submenu.Root>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );
    fireEvent.contextMenu(screen.getByText("작업 surface"));
    await screen.findByRole("menu", { name: "공유 메뉴" });

    fireEvent.click(screen.getByRole("menuitem", { name: "메일" }));
    expect(onSubmenuOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(onRootOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
    expect(screen.queryByRole("menu", { name: "공유 메뉴" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "공유" })).toBeNull();
  });
});
