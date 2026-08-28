import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { IconButtonUI } from "./iconButtonUI";

const PlusIcon = () => (
  <svg aria-hidden="true" viewBox="0 0 16 16">
    <path d="M7 3h2v4h4v2H9v4H7V9H3V7h4z" fill="currentColor" />
  </svg>
);

const meta = {
  title: "UI/Primitives/IconButtonUI",
  component: IconButtonUI,
  args: {
    icon: <PlusIcon />,
    label: "Add item",
  },
} satisfies Meta<typeof IconButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

const onIconButtonClick = fn();

export const Interaction: Story = {
  args: {
    onClick: onIconButtonClick,
  },
  play: async ({ canvasElement }) => {
    onIconButtonClick.mockClear();
    const button = within(canvasElement).getByRole("button", { name: "Add item" });

    button.focus();
    await userEvent.keyboard(" ");
    await expect(onIconButtonClick).toHaveBeenCalledOnce();
  },
};

export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Add item" });

    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
  },
};
