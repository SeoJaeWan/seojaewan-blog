import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { ContextMenuUI } from "./contextMenuUI";

afterEach(cleanupUITest);

describe("ContextMenuUI", () => {
  it("context-menu pointer action으로 menu 의미 구조를 연다", async () => {
    const onOpenChange = vi.fn();
    const onCheckedChange = vi.fn();

    renderUITest(
      <ContextMenuUI.Root onOpenChange={onOpenChange}>
        <ContextMenuUI.Trigger>Document surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="Document actions">
          <ContextMenuUI.Item>Open</ContextMenuUI.Item>
          <ContextMenuUI.Separator />
          <ContextMenuUI.CheckboxItem defaultChecked onCheckedChange={onCheckedChange}>
            Pin
          </ContextMenuUI.CheckboxItem>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("Document surface"), {
      clientX: 24,
      clientY: 48,
    });

    expect(await screen.findByRole("menu", { name: "Document actions" })).toBeTruthy();
    expect(screen.getByRole("menuitem", { name: "Open" })).toBeTruthy();
    expect(screen.getByRole("menuitemcheckbox", { name: "Pin" }).getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByRole("separator")).toBeTruthy();
    expect(onOpenChange).toHaveBeenCalledWith(true, { reason: "trigger-press" });

    fireEvent.click(screen.getByRole("menuitemcheckbox", { name: "Pin" }));
    expect(onCheckedChange).toHaveBeenCalledWith(false, { reason: "item-press" });
  });

  it("disabled action은 동작하지 않는다", async () => {
    const onClick = vi.fn();

    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>Surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Item disabled onClick={onClick}>
            Disabled action
          </ContextMenuUI.Item>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("Surface"));
    const item = await screen.findByRole("menuitem", { name: "Disabled action" });
    fireEvent.click(item);

    expect(item.getAttribute("aria-disabled")).toBe("true");
    expect(onClick).not.toHaveBeenCalled();
  });

  it("RadioGroup·RadioItem이 선택 state와 project change event를 제공한다", async () => {
    const onValueChange = vi.fn();

    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>Density surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.RadioGroup defaultValue="comfortable" onValueChange={onValueChange}>
            <ContextMenuUI.RadioItem value="compact">Compact</ContextMenuUI.RadioItem>
            <ContextMenuUI.RadioItem value="comfortable">Comfortable</ContextMenuUI.RadioItem>
          </ContextMenuUI.RadioGroup>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("Density surface"));
    expect(
      (await screen.findByRole("menuitemradio", { name: "Comfortable" })).getAttribute(
        "aria-checked",
      ),
    ).toBe("true");

    fireEvent.click(screen.getByRole("menuitemradio", { name: "Compact" }));
    expect(onValueChange).toHaveBeenCalledWith("compact", { reason: "item-press" });
  });

  it("Submenu Root·Trigger·Content가 고유 open state와 menu role을 제공한다", async () => {
    const onSubmenuOpenChange = vi.fn();

    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>Share surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content>
          <ContextMenuUI.Submenu.Root onOpenChange={onSubmenuOpenChange}>
            <ContextMenuUI.Submenu.Trigger>Share</ContextMenuUI.Submenu.Trigger>
            <ContextMenuUI.Submenu.Content aria-label="Context share submenu">
              <ContextMenuUI.Item>Email</ContextMenuUI.Item>
            </ContextMenuUI.Submenu.Content>
          </ContextMenuUI.Submenu.Root>
        </ContextMenuUI.Content>
      </ContextMenuUI.Root>,
    );

    fireEvent.contextMenu(screen.getByText("Share surface"));
    const trigger = await screen.findByRole("menuitem", { name: "Share" });
    expect(trigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    fireEvent.keyDown(trigger, { key: "ArrowRight" });

    expect(await screen.findByRole("menu", { name: "Context share submenu" })).toBeTruthy();
    expect(onSubmenuOpenChange).toHaveBeenCalledWith(true, { reason: "list-navigation" });
  });
});
