import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskbarStartButton } from "./index";

const meta = {
  title: "Taskbar/Button/TaskbarStartButton",
  component: TaskbarStartButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar 시작 버튼의 Windows logo visual이다. " +
          "기본, 선택, 비활성 상태를 고정 props로 보여 주며 panel 동작은 포함하지 않는다.",
      },
    },
  },
} satisfies Meta<typeof TaskbarStartButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
