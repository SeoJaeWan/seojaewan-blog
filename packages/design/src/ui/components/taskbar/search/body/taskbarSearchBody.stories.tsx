import type { Meta, StoryObj } from "@storybook/react-vite";

import {
  searchContents,
  searchFolder,
  SearchProductStory,
  searchShortcut,
} from "./taskbarSearchFixture.js";

const meta = {
  title: "Design/Components/Taskbar/SearchResults",
  component: SearchProductStory,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    controls: { disable: true },
    docs: {
      description: {
        component:
          "시작 메뉴와 작업 표시줄에서 같은 문서·폴더·외부 바로가기를 검색합니다. 방향키로 탐색하고 자세히 버튼으로 상세와 파일 위치를 확인할 수 있습니다.",
      },
    },
  },
} satisfies Meta<typeof SearchProductStory>;
export default meta;
type Story = StoryObj<typeof meta>;
export const ProductReference: Story = { name: "두 검색 화면 체험" };
export const Default: Story = { name: "최근 항목과 추천", args: { initialPanel: "search" } };
export const Results: Story = {
  name: "검색 결과 전체 목록",
  args: { initialPanel: "search", initialQuery: "검색" },
};
export const ContentDetail: Story = {
  name: "문서 상세와 긴 주소",
  args: { initialPanel: "search", initialQuery: "검색", detail: searchContents[0].ref },
};
export const FolderDetail: Story = {
  name: "폴더 상세와 긴 경로",
  args: { initialPanel: "search", initialQuery: "검색", detail: searchFolder },
};
export const ShortcutDetail: Story = {
  name: "외부 바로가기 상세",
  args: { initialPanel: "search", initialQuery: "검색", detail: searchShortcut },
};
export const StartResults: Story = {
  name: "시작 메뉴 검색 결과",
  args: { initialPanel: "start", initialQuery: "검색" },
};
export const StartContentDetail: Story = {
  name: "시작 메뉴 문서 상세",
  args: { initialPanel: "start", initialQuery: "검색", detail: searchContents[0].ref },
};
export const StartFolderDetail: Story = {
  name: "시작 메뉴 폴더 상세",
  args: { initialPanel: "start", initialQuery: "검색", detail: searchFolder },
};
export const StartShortcutDetail: Story = {
  name: "시작 메뉴 바로가기 상세",
  args: { initialPanel: "start", initialQuery: "검색", detail: searchShortcut },
};
