import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowsPanelAllSection } from "./index";
import { WindowsPanelAllViewUI } from "./index";

const SECTIONS: WindowsPanelAllSection[] = [
  {
    category: "B",
    items: [{ id: "coding-bfs", title: "BFS 미로 탐색 풀이" }],
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
];

const meta = {
  title: "Taskbar/View/WindowsPanelAllViewUI",
  component: WindowsPanelAllViewUI,
  decorators: [
    (Story) => (
      <div className="wb-windows-panel" style={{ height: 560, padding: 0, width: 520 }}>
        <div className="wb-windows-panel__views" data-view="all">
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
          "시작 panel의 모두 header, category jump와 전체 item list visual이다. " +
          "category overlay 상태를 controlled props로 렌더링한다.",
      },
    },
  },
  args: {
    sections: SECTIONS,
  },
} satisfies Meta<typeof WindowsPanelAllViewUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CategoryOverlayOpen: Story = {
  args: {
    categoryOverlayOpen: true,
  },
};
