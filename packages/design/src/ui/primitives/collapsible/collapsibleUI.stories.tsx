import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { CollapsibleUI } from "./index";

const meta = {
  title: "UI/Primitives/CollapsibleUI",
  component: CollapsibleUI.Root,
} satisfies Meta<typeof CollapsibleUI.Root>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Toggle: Story = {
  render: (args) => (
    <CollapsibleUI.Root {...args}>
      <CollapsibleUI.Trigger>Documents</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>Project files</CollapsibleUI.Panel>
    </CollapsibleUI.Root>
  ),
  play: async ({ canvas }) => {
    const trigger = canvas.getByRole("button", { name: "Documents" });

    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    trigger.focus();
    await userEvent.keyboard("{Enter}");

    const panel = await canvas.findByText("Project files");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(trigger).toHaveAttribute("aria-controls", panel.id);
  },
};

export const InitiallyOpen: Story = {
  args: {
    defaultOpen: true,
  },
  render: (args) => (
    <CollapsibleUI.Root {...args}>
      <CollapsibleUI.Trigger>Pictures</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>Saved pictures</CollapsibleUI.Panel>
    </CollapsibleUI.Root>
  ),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => (
    <CollapsibleUI.Root {...args}>
      <CollapsibleUI.Trigger>Downloads</CollapsibleUI.Trigger>
      <CollapsibleUI.Panel>Downloaded files</CollapsibleUI.Panel>
    </CollapsibleUI.Root>
  ),
};
