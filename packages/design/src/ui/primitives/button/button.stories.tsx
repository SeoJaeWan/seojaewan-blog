import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./button";

const meta = {
  component: Button,
  tags: ["autodocs"],
  title: "Primitives/Button",
} satisfies Meta<typeof Button>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "기본 작업",
  },
};

export const Disabled: Story = {
  args: {
    children: "사용할 수 없는 작업",
    disabled: true,
  },
};

export const ComposedLink: Story = {
  args: {
    children: "자세히 보기",
    render: <a href="#details" />,
  },
};
