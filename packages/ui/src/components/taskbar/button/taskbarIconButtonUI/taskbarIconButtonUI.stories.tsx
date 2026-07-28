import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon } from "../../../storyIcons";
import { TaskbarIconButtonUI } from "./index";

const meta = {
  title: "Taskbar/Button/TaskbarIconButtonUI",
  component: TaskbarIconButtonUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "taskbar 앱 아이콘의 시각 상태를 표현하는 표시용 버튼 — 세션 상태 인디케이터" +
          "(active/inactive), 패널 open 배경, dragging 비활성화를 담당한다. 패널 연동이 필요한 " +
          "실사용은 이 버튼을 감싼 TaskbarTaskButtonUI이 맡는다.",
      },
    },
  },
  args: {
    "aria-label": "블로그",
    icon: <FolderIcon />,
  },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["default", "inactive", "active"],
    },
  },
} satisfies Meta<typeof TaskbarIconButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Categories: Story = {
  render: (args) => (
    <div style={{ alignItems: "center", display: "flex", gap: 4 }}>
      <TaskbarIconButtonUI {...args} aria-label="블로그" icon={<FolderIcon />} state="active" />
      <TaskbarIconButtonUI {...args} aria-label="프로젝트" icon={<FolderIcon />} state="inactive" />
      <TaskbarIconButtonUI {...args} aria-label="코딩 테스트" icon={<FolderIcon />} />
      <TaskbarIconButtonUI {...args} aria-label="소개" icon={<FolderIcon />} />
    </div>
  ),
};

export const Inactive: Story = {
  args: {
    state: "inactive",
  },
};

export const Active: Story = {
  args: {
    state: "active",
  },
};

export const Open: Story = {
  args: {
    open: true,
    state: "inactive",
  },
};

export const Dragging: Story = {
  args: {
    dragging: true,
    state: "active",
  },
};
