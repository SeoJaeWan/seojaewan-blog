import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon } from "../../../storyIcons";
import { TaskbarTaskButtonUI } from "./index";

const meta = {
  title: "Taskbar/Button/TaskbarTaskButtonUI",
  component: TaskbarTaskButtonUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar app/task 버튼의 실행, open, dragging visual이다. " +
          "hover timer와 floating panel 없이 각 상태를 고정 props로 보여 준다.",
      },
    },
  },
  args: {
    "aria-label": "블로그",
    icon: <FolderIcon />,
  },
} satisfies Meta<typeof TaskbarTaskButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Active: Story = {
  args: {
    state: "active",
  },
};

export const Inactive: Story = {
  args: {
    state: "inactive",
  },
};

export const Open: Story = {
  args: {
    open: true,
    state: "active",
  },
};

export const Dragging: Story = {
  args: {
    dragging: true,
    state: "active",
  },
};
