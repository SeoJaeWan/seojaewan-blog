import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon } from "../../storyIcons";
import { TaskbarStartButton } from "../button/taskbarStartButton";
import { TaskbarTaskButton } from "../button/taskbarTaskButton";
import { TaskbarClock } from "../taskbarClock";
import { TaskbarSearch } from "../taskbarSearch";
import { TaskbarRoot } from "./index";

const FIXED_TIME = new Date("2026-07-10T06:24:00.000Z");

const meta = {
  title: "Taskbar/TaskbarRoot",
  component: TaskbarRoot,
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
} satisfies Meta<typeof TaskbarRoot>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Taskbar: Story = {
  render: () => (
    <TaskbarRoot>
      <TaskbarStartButton />
      <TaskbarSearch />
      <TaskbarTaskButton icon={<FolderIcon />} label="블로그" state="active" />
      <TaskbarTaskButton icon={<FolderIcon />} label="프로젝트" state="inactive" />
      <TaskbarClock value={FIXED_TIME} />
    </TaskbarRoot>
  ),
};

export const SearchOpen: Story = {
  render: () => (
    <TaskbarRoot>
      <TaskbarStartButton />
      <TaskbarSearch inputProps={{ defaultValue: "window" }} open />
      <TaskbarTaskButton icon={<FolderIcon />} label="블로그" state="active" />
      <TaskbarTaskButton icon={<FolderIcon />} label="프로젝트" state="inactive" />
      <TaskbarClock value={FIXED_TIME} />
    </TaskbarRoot>
  ),
};
