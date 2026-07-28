import { Dismiss20Regular, Pin20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContextMenuButtonUI } from "../../../base/button/contextMenuButtonUI";
import { FolderIcon } from "../../../storyIcons";
import { TaskbarContextMenuUI } from "./index";

const TASKS = [
  { id: "resume", title: "서재완 - 이력서" },
  { id: "media-list", title: "미디어 리스트 속도 개선기" },
];

const meta = {
  title: "Taskbar/Panel/TaskbarContextMenuUI",
  component: TaskbarContextMenuUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "작업 목록과 하단 action slot으로 구성되는 taskbar context menu visual이다. " +
          "실제 우클릭 동작은 ShellTaskbarAppList가 ShellTaskButton의 panel로 조립한다.",
      },
    },
  },
  args: {
    tasks: TASKS,
  },
} satisfies Meta<typeof TaskbarContextMenuUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <TaskbarContextMenuUI {...args}>
      <ContextMenuButtonUI icon={<FolderIcon />} label="소개" />
      <ContextMenuButtonUI icon={<Pin20Regular />} label="작업 표시줄에 고정" />
      <ContextMenuButtonUI icon={<Dismiss20Regular />} label="모든 창 닫기" />
    </TaskbarContextMenuUI>
  ),
};

export const WithoutTasks: Story = {
  args: {
    tasks: [],
  },
  render: (args) => (
    <TaskbarContextMenuUI {...args}>
      <ContextMenuButtonUI icon={<FolderIcon />} label="블로그" />
      <ContextMenuButtonUI icon={<Pin20Regular />} label="작업 표시줄에 고정" />
    </TaskbarContextMenuUI>
  ),
};
