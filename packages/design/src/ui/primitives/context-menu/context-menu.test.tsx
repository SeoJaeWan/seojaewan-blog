import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { ContextMenuUI } from "./context-menu";

afterEach(cleanupUITest);

describe("ContextMenuUI", () => {
  it("opens from a context-menu pointer action with menu semantics", async () => {
    renderUITest(
      <ContextMenuUI.Root>
        <ContextMenuUI.Trigger>Document surface</ContextMenuUI.Trigger>
        <ContextMenuUI.Content aria-label="Document actions">
          <ContextMenuUI.Item>Open</ContextMenuUI.Item>
          <ContextMenuUI.Separator />
          <ContextMenuUI.CheckboxItem defaultChecked>Pin</ContextMenuUI.CheckboxItem>
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
  });

  it("keeps disabled actions inert", async () => {
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
});
