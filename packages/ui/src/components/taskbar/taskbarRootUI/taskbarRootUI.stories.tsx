import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon } from "../../storyIcons";
import { TaskbarStartButtonUI } from "../button/taskbarStartButtonUI";
import { TaskbarTaskButtonUI } from "../button/taskbarTaskButtonUI";
import { TaskbarClockUI } from "../taskbarClockUI";
import { TaskbarSearchUI } from "../taskbarSearchUI";
import { TaskbarRootUI } from "./index";

const FIXED_TIME = new Date("2026-07-10T06:24:00.000Z");

const meta = {
  title: "Taskbar/TaskbarRootUI",
  component: TaskbarRootUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "화면 하단 taskbar의 glass surface와 내부 정렬 visual이다. " +
          "시작, 검색, app button, 시계를 고정 상태로 조립하며 provider나 panel 동작은 포함하지 않는다.",
      },
      story: { iframeHeight: 180, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof TaskbarRootUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Taskbar: Story = {
  render: () => (
    <TaskbarRootUI>
      <TaskbarStartButtonUI />
      <TaskbarSearchUI />
      <TaskbarTaskButtonUI aria-label="블로그" icon={<FolderIcon />} state="active" />
      <TaskbarTaskButtonUI aria-label="프로젝트" icon={<FolderIcon />} state="inactive" />
      <TaskbarClockUI value={FIXED_TIME} />
    </TaskbarRootUI>
  ),
};

export const SearchOpen: Story = {
  render: () => (
    <TaskbarRootUI>
      <TaskbarStartButtonUI />
      <TaskbarSearchUI inputProps={{ defaultValue: "window" }} open />
      <TaskbarTaskButtonUI aria-label="블로그" icon={<FolderIcon />} state="active" />
      <TaskbarTaskButtonUI aria-label="프로젝트" icon={<FolderIcon />} state="inactive" />
      <TaskbarClockUI value={FIXED_TIME} />
    </TaskbarRootUI>
  ),
};
