import type { Meta, StoryObj } from "@storybook/react-vite";

import { PopoverUI } from "./popover-ui";

const PopoverExample = ({
  defaultOpen = false,
  side = "bottom",
}: {
  defaultOpen?: boolean;
  side?: "top" | "bottom" | "left" | "right";
}) => (
  <PopoverUI defaultOpen={defaultOpen}>
    <PopoverUI.Trigger>Account</PopoverUI.Trigger>
    <PopoverUI.Content side={side}>
      <PopoverUI.Title>Account details</PopoverUI.Title>
      <PopoverUI.Description>Manage the signed-in account.</PopoverUI.Description>
      <PopoverUI.Close>Done</PopoverUI.Close>
    </PopoverUI.Content>
  </PopoverUI>
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

export const ReducedMotion: Story = {
  args: { defaultOpen: true },
  decorators: [
    (Story) => (
      <div className="wd-popover-ui-story--reduced-motion">
        <style>{`.wd-popover-ui-story--reduced-motion .wd-popover-ui__content { transition-duration: 0ms; }`}</style>
        <Story />
      </div>
    ),
  ],
};
