import type { Meta, StoryObj } from "@storybook/react-vite";

import type { TaskSearchResultItem } from "./index";
import { TaskSearchResultView } from "./index";

const RESULTS: TaskSearchResultItem[] = [
  { categoryId: "blog", id: "server-count", title: "서버 증설 횟수", typeLabel: "블로그" },
  { categoryId: "about", id: "resume", title: "서재완 - 이력서", typeLabel: "소개" },
  {
    categoryId: "blog",
    id: "ssr-csr",
    title: "SSR에서 CSR 왜 바꿨을까?",
    typeLabel: "블로그",
  },
];

const meta = {
  title: "Taskbar/Panel/TaskSearchResultView",
  component: TaskSearchResultView,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "SearchPanel과 WindowsPanel이 공유하는 검색 결과 visual이다. " +
          "목록과 상세 선택 상태를 detailItemId로 제어하며 Story에서는 고정된 상태만 보여 준다.",
      },
    },
  },
  args: {
    results: RESULTS,
    style: { height: 420, width: 620 },
  },
} satisfies Meta<typeof TaskSearchResultView>;

export default meta;

type Story = StoryObj<typeof meta>;

export const ResultList: Story = {};

export const DetailSelected: Story = {
  args: {
    detailItemId: "server-count",
  },
};
