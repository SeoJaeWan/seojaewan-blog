import { createRef } from "react";

import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../../../../testing";
import { ContextMenuUI } from "../../contextMenuUI";
import type { ContextMenuUIOpenChangeHandler } from "../../contextMenuUI.types";

afterEach(cleanupUITest);

const renderSubmenu = async ({
  submenuDefaultOpen = false,
  onOpenChange,
}: {
  submenuDefaultOpen?: boolean;
  onOpenChange?: ContextMenuUIOpenChangeHandler;
} = {}) => {
  renderUITest(
    <ContextMenuUI.Root>
      <ContextMenuUI.Trigger>작업 surface</ContextMenuUI.Trigger>
      <ContextMenuUI.Content aria-label="작업 메뉴">
        <ContextMenuUI.Submenu.Root defaultOpen={submenuDefaultOpen} onOpenChange={onOpenChange}>
          <ContextMenuUI.Submenu.Trigger>공유</ContextMenuUI.Submenu.Trigger>
          <ContextMenuUI.Submenu.Content aria-label="공유 메뉴">
            <ContextMenuUI.Item>메일</ContextMenuUI.Item>
          </ContextMenuUI.Submenu.Content>
        </ContextMenuUI.Submenu.Root>
      </ContextMenuUI.Content>
    </ContextMenuUI.Root>,
  );
  fireEvent.contextMenu(screen.getByText("작업 surface"));
  await screen.findByRole("menu", { name: "작업 메뉴" });
};

describe("ContextMenuUI 중첩 part", () => {
  it("Submenu Root가 독립 기본 open state와 변경 callback을 제공한다", async () => {
    const onOpenChange = vi.fn();
    await renderSubmenu({ onOpenChange, submenuDefaultOpen: true });

    expect(screen.getByRole("menu", { name: "공유 메뉴" })).toBeTruthy();
    fireEvent.click(screen.getByRole("menuitem", { name: "메일" }));
    expect(onOpenChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("Submenu Trigger가 menuitem role·이름·state·prop·ref 계약을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>작업 surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Submenu.Root>
            <ContextMenuUI.Submenu.Trigger className="custom-submenu" ref={ref}>
              공유
            </ContextMenuUI.Submenu.Trigger>
            <ContextMenuUI.Submenu.Content>
              <ContextMenuUI.Item>메일</ContextMenuUI.Item>
            </ContextMenuUI.Submenu.Content>
          </ContextMenuUI.Submenu.Root>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );
    fireEvent.contextMenu(screen.getByText("작업 surface"));

    const trigger = await screen.findByRole("menuitem", { name: "공유" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.classList.contains("custom-submenu")).toBe(true);
    expect(ref.current).toBe(trigger);
  });

  it("Submenu Content가 중첩 menu role·이름·DOM prop·ref 계약을 제공한다", async () => {
    const ref = createRef<HTMLDivElement>();
    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>작업 surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Submenu.Root defaultOpen>
            <ContextMenuUI.Submenu.Trigger>공유</ContextMenuUI.Submenu.Trigger>
            <ContextMenuUI.Submenu.Content
              aria-label="명명된 공유 메뉴"
              className="custom-submenu-content"
              ref={ref}
            >
              <ContextMenuUI.Item>메일</ContextMenuUI.Item>
            </ContextMenuUI.Submenu.Content>
          </ContextMenuUI.Submenu.Root>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );
    fireEvent.contextMenu(screen.getByText("작업 surface"));

    const content = await screen.findByRole("menu", { name: "명명된 공유 메뉴" });
    expect(content.classList.contains("custom-submenu-content")).toBe(true);
    expect(ref.current).toBe(content);
  });

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
