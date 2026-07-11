import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskbarRoot } from "../taskbarRoot";
import { TaskbarSearch } from "./index";

const meta = {
  title: "Taskbar/TaskbarSearch",
  component: TaskbarSearch,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar 검색 entry의 닫힘/열림 visual이다. " +
          "입력 활성화와 값 상태만 고정 props로 보여 주며 focus나 panel 동작은 포함하지 않는다.",
      },
      story: { iframeHeight: 180, inline: false },
    },
    layout: "fullscreen",
  },
  decorators: [(Story) => <TaskbarRoot><Story /></TaskbarRoot>],
} satisfies Meta<typeof TaskbarSearch>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const Open: Story = {
  args: {
    open: true,
  },
};

export const WithValue: Story = {
  args: {
    inputProps: {
      defaultValue: "window",
    },
    open: true,
  },
};
