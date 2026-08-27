import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { ButtonUI } from "./buttonUI";

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

const onButtonClick = fn();

export const Interaction: Story = {
  args: {
    onClick: onButtonClick,
  },
  play: async ({ canvasElement }) => {
    onButtonClick.mockClear();
    const button = within(canvasElement).getByRole("button", { name: "Open window" });

    await expect(button).toHaveAttribute("type", "button");
    await userEvent.click(button);
    await expect(onButtonClick).toHaveBeenCalledOnce();

    button.focus();
    await userEvent.keyboard("{Enter}");
    await expect(onButtonClick).toHaveBeenCalledTimes(2);
  },
};

export const FocusVisible: Story = {
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole("button", { name: "Open window" });

    await userEvent.tab();
    await expect(button).toHaveFocus();
    await expect(button.matches(":focus-visible")).toBe(true);
    await expect(getComputedStyle(button).outlineStyle).toBe("solid");
  },
};
