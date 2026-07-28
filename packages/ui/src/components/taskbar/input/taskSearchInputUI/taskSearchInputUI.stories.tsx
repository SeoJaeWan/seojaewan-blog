import type { Meta, StoryObj } from "@storybook/react-vite";

import { IconButtonUI } from "../../../base/button/iconButtonUI";
import { FolderIcon, WindowsLogoIcon } from "../../../storyIcons";
import { TaskbarIconButtonUI } from "../../button/taskbarIconButtonUI";
import { TaskSearchInputUI } from "./index";

const meta = {
  title: "Taskbar/Input/TaskSearchInputUI",
  component: TaskSearchInputUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "돋보기 아이콘이 붙은 검색 input visual이다. " +
          "기본, 비활성, 값이 채워진 상태와 taskbar 조립 예시를 고정 props로 보여 준다.",
      },
    },
  },
  args: {
    placeholder: "검색",
  },
} satisfies Meta<typeof TaskSearchInputUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};

export const WithValue: Story = {
  args: {
    defaultValue: "window",
  },
};

export const TaskbarContext: Story = {
  render: () => (
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, rgb(255 255 255 / 0.25), rgb(35 181 230 / 0.1), rgb(173 216 230 / 0.2), rgb(35 181 230 / 0.15), rgb(0 0 0 / 0.05)), #ffffff",
        borderTop: "1px solid rgb(204 208 217)",
        boxShadow: "0 18px 36px -18px rgb(15 23 42 / 0.25)",
        boxSizing: "border-box",
        display: "flex",
        gap: 12,
        height: 50,
        justifyContent: "center",
        padding: "4px 0",
        width: 448,
      }}
    >
      <IconButtonUI
        aria-label="시작"
        className="wb-taskbar-start-button"
        icon={<WindowsLogoIcon />}
        selected
        size="lg"
      />
      <TaskSearchInputUI defaultValue="window" />
      <TaskbarIconButtonUI aria-label="블로그" icon={<FolderIcon />} state="active" />
      <TaskbarIconButtonUI aria-label="프로젝트" icon={<FolderIcon />} state="inactive" />
    </div>
  ),
};
