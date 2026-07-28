import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon } from "../../storyIcons";
import { TaskbarTaskButtonUI } from "../button/taskbarTaskButtonUI";
import { TaskbarRootUI } from "../taskbarRootUI";
import { TaskbarAppListUI } from "./index";

const meta = {
  title: "Taskbar/TaskbarAppListUI",
  component: TaskbarAppListUI,
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
} satisfies Meta<typeof TaskbarAppListUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TaskbarRootUI>
      <TaskbarAppListUI>
        <TaskbarTaskButtonUI aria-label="블로그" icon={<FolderIcon />} state="active" />
        <TaskbarTaskButtonUI aria-label="프로젝트" icon={<FolderIcon />} state="inactive" />
        <TaskbarTaskButtonUI aria-label="코딩 테스트" icon={<FolderIcon />} state="default" />
      </TaskbarAppListUI>
    </TaskbarRootUI>
  ),
};

export const PanelOpen: Story = {
  render: () => (
    <TaskbarRootUI>
      <TaskbarAppListUI>
        <TaskbarTaskButtonUI aria-label="블로그" icon={<FolderIcon />} open state="active" />
        <TaskbarTaskButtonUI
          aria-label="프로젝트"
          dragging
          icon={<FolderIcon />}
          state="inactive"
        />
      </TaskbarAppListUI>
    </TaskbarRootUI>
  ),
};
