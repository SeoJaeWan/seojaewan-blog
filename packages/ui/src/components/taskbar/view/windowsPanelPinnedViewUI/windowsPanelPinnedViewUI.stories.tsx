import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowItem } from "../../../../types/windowItem";
import { FolderIcon } from "../../../storyIcons";
import { WindowsPanelPinnedViewUI } from "./index";

const ITEMS: WindowItem[] = [
  { icon: <FolderIcon />, id: "blog", title: "블로그" },
  { icon: <FolderIcon />, id: "project", title: "프로젝트" },
  { icon: <FolderIcon />, id: "coding-test", title: "코딩 테스트" },
  { icon: <FolderIcon />, id: "about", title: "소개" },
  { id: "resume", title: "서재완 - 이력서" },
  { description: "블로그", id: "rsc", title: "React Server Components 정리" },
  { id: "media-list", title: "미디어 리스트 속도 개선기" },
  { id: "monorepo", title: "모노레포 디자인 시스템 구축" },
];

const meta = {
  title: "Taskbar/View/WindowsPanelPinnedViewUI",
  component: WindowsPanelPinnedViewUI,
  decorators: [
    (Story) => (
      <div className="wb-windows-panel" style={{ height: 560, padding: 0, width: 520 }}>
        <div className="wb-windows-panel__views" data-view="pinned">
          <Story />
        </div>
      </div>
    ),
  ],
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "시작 panel의 고정됨 header와 타일 grid visual이다. " +
          "화면 활성 상태와 reorder animation을 controlled props로 렌더링한다.",
      },
    },
  },
  args: {
    items: ITEMS,
  },
} satisfies Meta<typeof WindowsPanelPinnedViewUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ReorderOut: Story = {
  args: {
    itemAnimation: {
      itemId: "rsc",
      phase: "out",
    },
  },
};

export const ReorderIn: Story = {
  args: {
    itemAnimation: {
      itemId: "rsc",
      phase: "in",
    },
  },
};
