import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowItem } from "../../../../types/windowItem";
import type { WindowItemActionState } from "../../../../types/windowItemAction";
import { FolderIcon } from "../../../storyIcons";
import { TaskSearchResultViewUI } from "../../view/taskSearchResultViewUI";
import { WindowsPanelAllViewUI } from "../../view/windowsPanelAllViewUI";
import { WindowsPanelPinnedViewUI } from "../../view/windowsPanelPinnedViewUI";
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
          "시작 패널의 compound root와 공통 SearchInput을 제공한다. " +
          "각 Story는 분리된 Pinned/All UI 또는 TaskSearchResultViewUI를 children으로 조합한다.",
      },
    },
  },
  args: {
    // Storybook 캔버스에서는 viewport 기반 반응형 폭 대신 고정 폭으로 확인
    style: { width: 520 },
  },
} satisfies Meta<typeof WindowsPanelUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <WindowsPanelUI {...args}>
      <WindowsPanelUI.SearchInput readOnly />
      <div className="wb-windows-panel__views" data-view="pinned">
        <WindowsPanelPinnedViewUI items={PINNED_ITEMS} />
        <WindowsPanelAllViewUI active={false} />
      </div>
    </WindowsPanelUI>
  ),
};

export const SearchView: Story = {
  render: (args) => (
    <WindowsPanelUI {...args}>
      <WindowsPanelUI.SearchInput readOnly value="정리" />
      <TaskSearchResultViewUI
        className="wb-windows-panel__search-results"
        results={SEARCH_RESULTS}
      />
    </WindowsPanelUI>
  ),
};

export const SearchDetail: Story = {
  render: (args) => (
    <WindowsPanelUI {...args}>
      <WindowsPanelUI.SearchInput readOnly value="정리" />
      <TaskSearchResultViewUI
        className="wb-windows-panel__search-results"
        detailActions={DETAIL_ACTIONS}
        detailItemId="rsc"
        onDetailAction={() => undefined}
        results={SEARCH_RESULTS}
      />
    </WindowsPanelUI>
  ),
};
