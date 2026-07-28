import type { Meta, StoryObj } from "@storybook/react-vite";

import { TaskPanelUI } from "./index";

const meta = {
  title: "Base/Panel/TaskPanelUI",
  component: TaskPanelUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "taskbar 위에 표시되는 시작/검색/hover/context panel의 공통 glass surface다. " +
          "위치와 열림/닫힘 transition은 TaskbarPanelContainerUI와 외부 기능 계층이 담당한다.",
      },
    },
  },
  args: {
    style: {
      padding: 20,
      width: 420,
    },
  },
} satisfies Meta<typeof TaskPanelUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: "패널 콘텐츠",
  },
};
