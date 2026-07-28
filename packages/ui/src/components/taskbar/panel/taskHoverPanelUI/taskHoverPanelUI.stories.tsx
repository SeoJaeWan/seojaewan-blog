import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import type { TaskHoverPanelItem } from "./index";
import { TaskHoverPanelUI } from "./index";

// 원본은 ScaledWindow로 실제 세션 화면(1920x1024)을 축소해 채운다 —
// Storybook에서는 축소된 문서 페이지 느낌의 목업으로 대체
const MockWindowPreview = ({ title }: { title: string }) => (
  <div
    style={{
      background: "#ffffff",
      border: "1px solid rgb(229 231 235)",
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      gap: 6,
      height: "100%",
      overflow: "hidden",
      padding: 10,
      width: "100%",
    }}
  >
    <div style={{ color: "rgb(32 33 36)", fontSize: 9, fontWeight: 700 }}>{title}</div>
    <div style={{ background: "rgb(243 244 246)", borderRadius: 2, height: 6, width: "90%" }} />
    <div style={{ background: "rgb(243 244 246)", borderRadius: 2, height: 6, width: "72%" }} />
    <div style={{ background: "rgb(243 244 246)", borderRadius: 2, height: 6, width: "84%" }} />
    <div style={{ background: "rgb(243 244 246)", borderRadius: 2, flex: 1 }} />
  </div>
);

// 원본 hover panel은 카테고리의 활성/배경/숨김 세션(폴더 + 게시글)을 나란히 보여준다
const ITEMS: TaskHoverPanelItem[] = [
  {
    icon: <FolderIcon />,
    id: "blog",
    preview: <MockWindowPreview title="블로그" />,
    title: "블로그",
  },
  {
    icon: <FileIcon />,
    id: "blog-rsc",
    preview: <MockWindowPreview title="React Server Components 정리" />,
    title: "React Server Components 정리",
  },
  {
    icon: <FileIcon />,
    id: "blog-media-list",
    preview: <MockWindowPreview title="미디어 리스트 속도 개선기" />,
    title: "미디어 리스트 속도 개선기",
  },
];

const meta = {
  title: "Taskbar/Panel/TaskHoverPanelUI",
  component: TaskHoverPanelUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "열린 session thumbnail의 구성과 개수별 layout을 보여 주는 taskbar panel visual이다. " +
          "실제 hover와 session 동작은 ShellTaskbarAppList가 ShellTaskButton의 panel로 조립한다.",
      },
    },
  },
  args: {
    items: ITEMS,
  },
} satisfies Meta<typeof TaskHoverPanelUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SingleSession: Story = {
  args: {
    items: ITEMS.slice(0, 1),
  },
};

// 세션이 많으면 폭이 min(80vw, n*200px)로 잘리고 각 열이 균등 축소된다
export const ManySessions: Story = {
  args: {
    items: [
      ...ITEMS,
      {
        icon: <FileIcon />,
        id: "blog-monorepo",
        preview: <MockWindowPreview title="모노레포 디자인 시스템 구축" />,
        title: "모노레포 디자인 시스템 구축",
      },
      {
        icon: <FileIcon />,
        id: "blog-suspense",
        preview: <MockWindowPreview title="Suspense 스트리밍 삽질기" />,
        title: "Suspense 스트리밍 삽질기",
      },
      {
        icon: <FileIcon />,
        id: "blog-vitals",
        preview: <MockWindowPreview title="Web Vitals 개선 기록" />,
        title: "Web Vitals 개선 기록",
      },
    ],
  },
};
