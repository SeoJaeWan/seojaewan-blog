import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon } from "../../../storyIcons";
import { TaskbarIconButton } from "./index";

const meta = {
  title: "Taskbar/Button/TaskbarIconButton",
  component: TaskbarIconButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "taskbar 앱 아이콘의 시각 상태를 표현하는 표시용 버튼 — 세션 상태 인디케이터" +
          "(active/inactive), 패널 open 배경, dragging 비활성화를 담당한다. 패널 연동이 필요한 " +
          "실사용은 이 버튼을 감싼 TaskbarTaskButton이 맡는다.",
      },
    },
  },
  args: {
    icon: <FolderIcon />,
    label: "블로그",
  },
  argTypes: {
    state: {
      control: "inline-radio",
      options: ["default", "inactive", "active"],
    },
  },
} satisfies Meta<typeof TaskbarIconButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Categories: Story = {
  render: (args) => (
    <div style={{ alignItems: "center", display: "flex", gap: 4 }}>
      <TaskbarIconButton {...args} icon={<FolderIcon />} label="블로그" state="active" />
      <TaskbarIconButton {...args} icon={<FolderIcon />} label="프로젝트" state="inactive" />
      <TaskbarIconButton {...args} icon={<FolderIcon />} label="코딩 테스트" />
      <TaskbarIconButton {...args} icon={<FolderIcon />} label="소개" />
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
