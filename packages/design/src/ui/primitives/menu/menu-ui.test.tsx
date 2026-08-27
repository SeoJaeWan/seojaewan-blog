import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { cleanupUITest, renderUITest } from "../testing";
import { MenuUI } from "./menu-ui";

afterEach(cleanupUITest);

const MenuFixture = ({ onOpenChange = vi.fn() }) => (
  <MenuUI.Root onOpenChange={onOpenChange}>
    <MenuUI.Trigger>Actions</MenuUI.Trigger>
    <MenuUI.Content aria-label="Actions menu">
      <MenuUI.Item>Open</MenuUI.Item>
      <MenuUI.Item disabled>Unavailable</MenuUI.Item>
      <MenuUI.Separator />
      <MenuUI.CheckboxItem defaultChecked>Show details</MenuUI.CheckboxItem>
      <MenuUI.RadioGroup defaultValue="comfortable">
        <MenuUI.RadioItem value="compact">Compact</MenuUI.RadioItem>
        <MenuUI.RadioItem value="comfortable">Comfortable</MenuUI.RadioItem>
      </MenuUI.RadioGroup>
      <MenuUI.Submenu.Root>
        <MenuUI.Submenu.Trigger>Share</MenuUI.Submenu.Trigger>
        <MenuUI.Submenu.Content aria-label="Share submenu">
          <MenuUI.Item>Email</MenuUI.Item>
        </MenuUI.Submenu.Content>
      </MenuUI.Submenu.Root>
    </MenuUI.Content>
  </MenuUI.Root>
);

describe("MenuUI", () => {
  it("coordinator 조합을 위한 focus 가능한 프로젝트 trigger를 제공한다", async () => {
    renderUITest(
      <MenuUI.Root>
        <MenuUI.Trigger render={<button data-testid="composed-trigger" type="button" />}>
          Composed actions
        </MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Item>Open</MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    const trigger = screen.getByTestId("composed-trigger");
    expect(trigger.tagName).toBe("BUTTON");
    fireEvent.click(trigger);
    expect(await screen.findByRole("menuitem", { name: "Open" })).toBeTruthy();
  });

  it("menu, item, selection, submenu, separator 의미 구조를 제공한다", async () => {
    renderUITest(<MenuFixture />);

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));

    expect(await screen.findByRole("menu", { name: "Actions menu", hidden: true })).toBeTruthy();
    expect(
      screen.getByRole("menuitem", { name: "Unavailable" }).getAttribute("aria-disabled"),
    ).toBe("true");
    expect(
      screen.getByRole("menuitemcheckbox", { name: "Show details" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(
      screen.getByRole("menuitemradio", { name: "Comfortable" }).getAttribute("aria-checked"),
    ).toBe("true");
    expect(screen.getByRole("separator").getAttribute("aria-orientation")).toBe("horizontal");

    const submenuTrigger = screen.getByRole("menuitem", { name: "Share" });
    expect(submenuTrigger.getAttribute("aria-haspopup")).toBe("menu");
    expect(submenuTrigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("disabled item은 동작하지 않고 프로젝트 change reason을 보고한다", async () => {
    const onDisabledClick = vi.fn();
    const onOpenChange = vi.fn();

    renderUITest(
      <MenuUI.Root onOpenChange={onOpenChange}>
        <MenuUI.Trigger>Actions</MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.Item disabled onClick={onDisabledClick}>
            Unavailable
          </MenuUI.Item>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Actions" }));
    const item = await screen.findByRole("menuitem", { name: "Unavailable" });
    fireEvent.click(item);

    expect(onDisabledClick).not.toHaveBeenCalled();
    await waitFor(() => expect(onOpenChange).toHaveBeenCalled());
    expect(onOpenChange.mock.calls[0]?.[1]).toEqual({ reason: "trigger-press" });
  });

  it("vendor event 세부 정보를 노출하지 않고 checkbox와 radio 변경을 보고한다", async () => {
    const onCheckedChange = vi.fn();
    const onValueChange = vi.fn();

    renderUITest(
      <MenuUI.Root>
        <MenuUI.Trigger>Preferences</MenuUI.Trigger>
        <MenuUI.Content>
          <MenuUI.CheckboxItem onCheckedChange={onCheckedChange}>Details</MenuUI.CheckboxItem>
          <MenuUI.RadioGroup defaultValue="one" onValueChange={onValueChange}>
            <MenuUI.RadioItem value="one">One</MenuUI.RadioItem>
            <MenuUI.RadioItem value="two">Two</MenuUI.RadioItem>
          </MenuUI.RadioGroup>
        </MenuUI.Content>
      </MenuUI.Root>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Preferences" }));
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: "Details" }));
    fireEvent.click(screen.getByRole("menuitemradio", { name: "Two" }));

    expect(onCheckedChange).toHaveBeenCalledWith(true, { reason: "item-press" });
    expect(onValueChange).toHaveBeenCalledWith("two", { reason: "item-press" });
  });
});
