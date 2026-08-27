import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent } from "storybook/test";

import { IconButtonUI } from "./index";

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

export const FocusVisible: Story = {
  play: async () => {
    await userEvent.tab();
  },
};
