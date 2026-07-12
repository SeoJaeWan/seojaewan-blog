import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon } from "../../storyIcons";
import { TaskbarTaskButton } from "../button/taskbarTaskButton";
import { TaskbarRoot } from "../root";
import { TaskbarAppList } from "./index";

const meta = {
  title: "Taskbar/TaskbarAppList",
  component: TaskbarAppList,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Taskbar 가운데에서 app/task button visual을 한 줄로 배치하는 순수 layout이다. " +
          "Story에서는 고정된 실행 상태만 보여 주며 pin, session, hover와 context menu 동작은 포함하지 않는다.",
      },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarAppList>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TaskbarRoot>
      <TaskbarAppList>
        <TaskbarTaskButton aria-label="블로그" icon={<FolderIcon />} state="active" />
        <TaskbarTaskButton aria-label="프로젝트" icon={<FolderIcon />} state="inactive" />
        <TaskbarTaskButton aria-label="코딩 테스트" icon={<FolderIcon />} state="default" />
      </TaskbarAppList>
    </TaskbarRoot>
  ),
};

export const PanelOpen: Story = {
  render: () => (
    <TaskbarRoot>
      <TaskbarAppList>
        <TaskbarTaskButton aria-label="블로그" icon={<FolderIcon />} open state="active" />
        <TaskbarTaskButton
          aria-label="프로젝트"
          dragging
          icon={<FolderIcon />}
          state="inactive"
        />
      </TaskbarAppList>
    </TaskbarRoot>
  ),
};
