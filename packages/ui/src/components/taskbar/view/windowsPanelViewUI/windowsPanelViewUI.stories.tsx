import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowItem } from "../../../../types/windowItem";
import { FolderIcon } from "../../../storyIcons";
import type { WindowsPanelSection } from "./index";
import { WindowsPanelViewUI } from "./index";

const PINNED_ITEMS: WindowItem[] = [
  { icon: <FolderIcon />, id: "blog", title: "블로그" },
  { icon: <FolderIcon />, id: "project", title: "프로젝트" },
  { icon: <FolderIcon />, id: "coding-test", title: "코딩 테스트" },
  { icon: <FolderIcon />, id: "about", title: "소개" },
  { id: "resume", title: "서재완 - 이력서" },
  { description: "블로그", id: "rsc", title: "React Server Components 정리" },
  { id: "media-list", title: "미디어 리스트 속도 개선기" },
  { id: "monorepo", title: "모노레포 디자인 시스템 구축" },
];

// 원본 sortList는 제목 첫 글자(한글 초성/영문 대문자)를 키로 묶는다
const SECTIONS: WindowsPanelSection[] = [
  {
    category: "B",
    items: [{ id: "coding-bfs", title: "BFS 미로 탐색 풀이" }],
  },
  {
    category: "D",
    items: [{ id: "coding-dp", title: "DP 계단 오르기 풀이" }],
  },
  {
    category: "N",
    items: [{ id: "project-neu-blog", title: "neu-blog" }],
  },
  {
    category: "R",
    items: [{ id: "blog-rsc", title: "React Server Components 정리" }],
  },
  {
    category: "W",
    items: [{ id: "project-window-blog", title: "window-blog" }],
  },
  {
    category: "ㅁ",
    items: [
      { id: "blog-media-list", title: "미디어 리스트 속도 개선기" },
      { id: "blog-monorepo", title: "모노레포 디자인 시스템 구축" },
    ],
  },
  {
    category: "ㅅ",
    items: [{ id: "about-resume", title: "서재완 - 이력서" }],
  },
];

const meta = {
  title: "Taskbar/View/WindowsPanelViewUI",
  component: WindowsPanelViewUI,
  decorators: [
    (Story) => (
      <div className="wb-windows-panel" style={{ height: 560, padding: 0, width: 520 }}>
        <Story />
      </div>
    ),
  ],
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "시작 panel이 검색어가 없을 때 사용하는 고정됨/모두 visual이다. " +
          "두 화면과 category overlay, reorder 상태를 controlled props로 렌더링한다.",
      },
    },
  },
  args: {
    pinnedItems: PINNED_ITEMS,
    sections: SECTIONS,
  },
} satisfies Meta<typeof WindowsPanelViewUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const PinnedView: Story = {};

export const AllView: Story = {
  args: {
    view: "all",
  },
};

export const CategoryOverlayOpen: Story = {
  args: {
    categoryOverlayOpen: true,
    view: "all",
  },
};

export const ReorderOut: Story = {
  args: {
    pinnedItemAnimation: {
      itemId: "rsc",
      phase: "out",
    },
  },
};

export const ReorderIn: Story = {
  args: {
    pinnedItemAnimation: {
      itemId: "rsc",
      phase: "in",
    },
  },
};
