import type { Meta, StoryObj } from "@storybook/react-vite";
import { userEvent } from "storybook/test";

import { ButtonUI } from "./index";

const meta = {
  title: "UI/Primitives/ButtonUI",
  component: ButtonUI,
  args: {
    children: "Open window",
  },
} satisfies Meta<typeof ButtonUI>;

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
