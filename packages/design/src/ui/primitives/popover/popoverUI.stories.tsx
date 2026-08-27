import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { PopoverUI } from "./popoverUI";

const PopoverExample = ({
  defaultOpen = false,
  side = "bottom",
}: {
  defaultOpen?: boolean;
  side?: "top" | "bottom" | "left" | "right";
}) => (
  <div style={{ display: "grid", gap: 16, minHeight: 240, placeItems: "center" }}>
    <button type="button">Outside action</button>
    <PopoverUI defaultOpen={defaultOpen}>
      <PopoverUI.Trigger>Account</PopoverUI.Trigger>
      <PopoverUI.Content side={side}>
        <PopoverUI.Title>Account details</PopoverUI.Title>
        <PopoverUI.Description>Manage the signed-in account.</PopoverUI.Description>
        <label>
          Display name
          <input aria-label="Display name" />
        </label>
        <PopoverUI.Close>Done</PopoverUI.Close>
      </PopoverUI.Content>
    </PopoverUI>
  </div>
);

const meta = {
  title: "UI/Primitives/PopoverUI",
  component: PopoverExample,
  parameters: { layout: "centered" },
} satisfies Meta<typeof PopoverExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
};

export const Placement: Story = {
  args: { defaultOpen: true, side: "right" },
};

export const PortalAndDismissal: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const page = within(canvasElement.ownerDocument.body);
    const outside = canvas.getByRole("button", { name: "Outside action" });
    const trigger = canvas.getByRole("button", { name: "Account" });

    await userEvent.click(trigger);

    const dialog = await page.findByRole("dialog", { name: "Account details" });
    await expect(canvasElement.contains(dialog)).toBe(false);
    await expect(page.getByRole("textbox", { name: "Display name" })).toHaveFocus();

    await userEvent.click(outside);
    await waitFor(() => expect(page.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(outside).toHaveFocus();

    await userEvent.click(trigger);
    await page.findByRole("dialog", { name: "Account details" });
    await userEvent.keyboard("{Escape}");
    await waitFor(() => expect(page.queryByRole("dialog")).not.toBeInTheDocument());
    await expect(trigger).toHaveFocus();
  },
};

export const ReducedMotion: Story = {
  args: { defaultOpen: true },
  play: async ({ canvasElement }) => {
    const { cdp } = await import("vitest/browser");
    const session = cdp();
    const page = within(canvasElement.ownerDocument.body);

    await session.send("Emulation.setEmulatedMedia", {
      features: [{ name: "prefers-reduced-motion", value: "reduce" }],
    });

    try {
      const dialog = await page.findByRole("dialog", { name: "Account details" });
      await expect(getComputedStyle(dialog).transitionDuration).toBe("0s");
    } finally {
      await session.send("Emulation.setEmulatedMedia", {
        features: [{ name: "prefers-reduced-motion", value: "no-preference" }],
      });
    }
  },
};
