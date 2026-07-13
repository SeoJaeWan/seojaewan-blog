import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowItem } from "../../../../types/windowItem";
import type { WindowItemActionState } from "../../../../types/windowItemAction";
import { FolderIcon } from "../../../storyIcons";
import type { WindowsPanelSection } from "./index";
import { WindowsPanelUI } from "./index";

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

const SEARCH_RESULTS = PINNED_ITEMS.filter((item) => item.title.includes("정리"));

const DETAIL_ACTIONS: WindowItemActionState[] = [
  { id: "open" },
  { id: "openLocation" },
  { id: "pinToStart" },
  { id: "pinToTaskbar" },
];

const meta = {
  title: "Taskbar/Panel/WindowsPanelUI",
  component: WindowsPanelUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "시작 패널의 고정됨, 모두, category overlay, 검색, reorder visual을 렌더링한다. " +
          "각 Story는 provider나 내부 상태 없이 controlled props로 한 가지 화면 상태를 보여 준다.",
      },
    },
  },
  args: {
    pinnedItems: PINNED_ITEMS,
    sections: SECTIONS,
    // Storybook 캔버스에서는 viewport 기반 반응형 폭 대신 고정 폭으로 확인
    style: { width: 520 },
  },
} satisfies Meta<typeof WindowsPanelUI>;

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

export const SearchView: Story = {
  args: {
    searchInputProps: {
      readOnly: true,
      value: "정리",
    },
    searchResults: SEARCH_RESULTS,
    searchValue: "정리",
  },
};

export const SearchDetail: Story = {
  args: {
    detailActions: DETAIL_ACTIONS,
    detailItemId: "rsc",
    onDetailAction: () => undefined,
    searchInputProps: {
      readOnly: true,
      value: "정리",
    },
    searchResults: SEARCH_RESULTS,
    searchValue: "정리",
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
