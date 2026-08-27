import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { cleanupUITest, getActiveHTMLElement, renderUITest } from "../testing";
import { MenuUI } from "./menu-ui";

afterEach(cleanupUITest);

const browserTest = /Chrome/u.test(navigator.userAgent) ? it : it.skip;

describe("MenuUI (Chromium)", () => {
  browserTest("방향키 탐색, disabled 동작, submenu, Escape를 지원한다", async () => {
    renderUITest(
      <MenuUI.Root>
        <MenuUI.Trigger>Actions</MenuUI.Trigger>
        <MenuUI.Content aria-label="Actions menu">
          <MenuUI.Item>First</MenuUI.Item>
          <MenuUI.Item disabled>Disabled</MenuUI.Item>
          <MenuUI.Item>Second</MenuUI.Item>
          <MenuUI.Submenu.Root>
            <MenuUI.Submenu.Trigger>More</MenuUI.Submenu.Trigger>
            <MenuUI.Submenu.Content aria-label="More actions">
              <MenuUI.Item>Nested</MenuUI.Item>
            </MenuUI.Submenu.Content>
          </MenuUI.Submenu.Root>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    const trigger = screen.getByRole("button", { name: "Actions" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });

    const first = await screen.findByRole("menuitem", { name: "First" });
    await waitFor(() => expect(getActiveHTMLElement()).toBe(first));

    fireEvent.keyDown(first, { key: "ArrowDown" });
    const disabled = screen.getByRole("menuitem", { name: "Disabled" });
    await waitFor(() => expect(getActiveHTMLElement()).toBe(disabled));
    expect(disabled.getAttribute("aria-disabled")).toBe("true");

    fireEvent.keyDown(disabled, { key: "ArrowDown" });
    const second = screen.getByRole("menuitem", { name: "Second" });
    await waitFor(() => expect(getActiveHTMLElement()).toBe(second));

    fireEvent.keyDown(second, { key: "ArrowDown" });
    const submenuTrigger = screen.getByRole("menuitem", { name: "More" });
    await waitFor(() => expect(getActiveHTMLElement()).toBe(submenuTrigger));
    fireEvent.keyDown(submenuTrigger, { key: "ArrowRight" });

    const nested = await screen.findByRole("menuitem", { name: "Nested" });
    await waitFor(() => expect(getActiveHTMLElement()).toBe(nested));
    const openSubmenuTrigger = screen.getByRole("menuitem", { name: "More" });
    expect(openSubmenuTrigger.hasAttribute("data-popup-open")).toBe(true);
    expect(openSubmenuTrigger.getAttribute("aria-controls")).toBe(
      screen.getByRole("menu", { name: "More actions" }).id,
    );

    fireEvent.keyDown(nested, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu", { name: "More actions" })).toBeNull());
    fireEvent.keyDown(screen.getByRole("menuitem", { name: "More" }), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu", { name: "Actions menu" })).toBeNull());
    expect(getActiveHTMLElement()).toBe(trigger);
  });
});
