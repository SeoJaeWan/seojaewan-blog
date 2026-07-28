import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import { PanelIconButtonUI } from "./index";

const meta = {
  title: "Taskbar/Button/PanelIconButtonUI",
  component: PanelIconButtonUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "taskbar 패널 내부 그리드의 항목 타일 버튼(아이콘 + 제목). 시작 패널(WindowsPanelUI)의 " +
          "고정됨 그리드가 패널 스코프 CSS 오버라이드와 함께 이 버튼으로 항목을 그린다.",
      },
    },
  },
  args: {
    icon: <FileIcon />,
    title: "React Server Components 정리",
  },
  argTypes: {
    lines: {
      control: "inline-radio",
      options: [1, 2],
    },
  },
} satisfies Meta<typeof PanelIconButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Folder: Story = {
  args: {
    icon: <FolderIcon />,
    lines: 1,
    title: "프로젝트",
  },
};

export const PinnedItems: Story = {
  render: (args) => (
    <div
      style={{
        display: "grid",
        gap: 8,
        gridTemplateColumns: "repeat(4, 76px)",
      }}
    >
      <PanelIconButtonUI {...args} icon={<FolderIcon />} title="블로그" />
      <PanelIconButtonUI {...args} icon={<FolderIcon />} title="프로젝트" />
      <PanelIconButtonUI {...args} icon={<FolderIcon />} title="코딩 테스트" />
      <PanelIconButtonUI {...args} icon={<FileIcon />} title="서재완 - 이력서" />
    </div>
  ),
};

export const Selected: Story = {
  args: {
    selected: true,
    title: "미디어 리스트 속도 개선기",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
