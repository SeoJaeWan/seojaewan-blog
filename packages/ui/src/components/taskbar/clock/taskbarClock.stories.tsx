import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskbarRoot } from "../root";
import { TaskbarClock } from "./index";

const FIXED_TIME = new Date("2026-07-10T06:24:00.000Z");

const meta = {
  title: "Taskbar/TaskbarClock",
  component: TaskbarClock,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar 오른쪽의 시간/날짜 visual이다. " +
          "고정된 시각과 skeleton 상태를 props로 보여 주며 live timer는 포함하지 않는다.",
      },
      story: { iframeHeight: 180, inline: false },
    },
    layout: "fullscreen",
  },
  decorators: [(Story) => <TaskbarRoot><Story /></TaskbarRoot>],
} satisfies Meta<typeof TaskbarClock>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    value: FIXED_TIME,
  },
};

export const Skeleton: Story = {
  args: {
    value: null,
  },
};
