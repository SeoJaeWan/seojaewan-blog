import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent } from "storybook/test";

import { InputUI } from "./index";

const meta = {
  title: "UI/Primitives/InputUI",
  component: InputUI,
  args: {
    "aria-label": "파일 검색",
    placeholder: "검색",
  },
} satisfies Meta<typeof InputUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    defaultValue: "검색할 수 없음",
    disabled: true,
  },
};

export const TextEntry: Story = {
  play: async ({ canvas }) => {
    const input = canvas.getByRole("textbox", { name: "파일 검색" });

    await userEvent.type(input, "documents");

    await expect(input).toHaveValue("documents");
  },
};
