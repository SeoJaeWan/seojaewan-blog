import type { Meta, StoryObj } from "@storybook/react-vite";

import { TooltipUI } from "./tooltip-ui";

const TooltipExample = ({
  defaultOpen = false,
  delay = 600,
  side = "top",
}: {
  defaultOpen?: boolean;
  delay?: number;
  side?: "top" | "bottom" | "left" | "right";
}) => (
  <TooltipUI defaultOpen={defaultOpen} delay={delay}>
    <TooltipUI.Trigger aria-label="Settings">⚙</TooltipUI.Trigger>
    <TooltipUI.Content side={side}>Open settings</TooltipUI.Content>
  </TooltipUI>
);

const meta = {
  title: "UI/Primitives/TooltipUI",
  component: TooltipExample,
  parameters: { layout: "centered" },
} satisfies Meta<typeof TooltipExample>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  args: { defaultOpen: true },
};

export const Placement: Story = {
  args: { defaultOpen: true, side: "right" },
};

export const Delayed: Story = {
  args: { delay: 900 },
};

export const ReducedMotion: Story = {
  args: { defaultOpen: true },
  decorators: [
    (Story) => (
      <div className="wd-tooltip-ui-story--reduced-motion">
        <style>{`.wd-tooltip-ui-story--reduced-motion .wd-tooltip-ui__content { transition-duration: 0ms; }`}</style>
        <Story />
      </div>
    ),
  ],
};
