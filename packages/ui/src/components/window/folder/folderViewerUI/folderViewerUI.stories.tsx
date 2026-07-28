import type { ReactNode } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import { FolderCategoryItemUI } from "../folderCategoryItemUI";
import { FolderFileCardUI } from "../folderFileCardUI";
import { FolderFileGridUI } from "../folderFileGridUI";
import { FolderSidebarUI } from "../folderSidebarUI";
import { FolderViewerUI } from "./index";

const MockCover = ({ hue }: { hue: number }) => (
  <span
    style={{
      background: `linear-gradient(140deg, hsl(${hue} 60% 82%), hsl(${hue + 40} 55% 65%))`,
      display: "block",
      height: "100%",
      width: "100%",
    }}
  />
);

const FILES = [
  { hue: 210, id: "rsc", title: "React Server Components 정리" },
  { hue: 30, id: "media-list", title: "미디어 리스트 속도 개선기" },
  { hue: 120, id: "monorepo", title: "모노레포 디자인 시스템 구축" },
  { hue: 280, id: "suspense", title: "Suspense 스트리밍 삽질기" },
  { hue: 0, id: "vitals", title: "Web Vitals 개선 기록" },
  { hue: 170, id: "ssr-csr", title: "SSR에서 CSR 왜 바꿨을까?" },
];

const BLOG_ITEMS = FILES.slice(0, 3).map((file) => ({
  icon: <FileIcon />,
  id: file.id,
  title: file.title,
}));

const Sidebar = (
  <FolderSidebarUI>
    <FolderCategoryItemUI
      expanded
      icon={<FolderIcon />}
      items={BLOG_ITEMS}
      label="블로그"
      selected
    />
    <FolderCategoryItemUI icon={<FolderIcon />} label="프로젝트" />
    <FolderCategoryItemUI icon={<FolderIcon />} label="코딩 테스트" />
    <FolderCategoryItemUI icon={<FolderIcon />} label="소개" />
  </FolderSidebarUI>
);

// 사이드바는 창 폭 container query(@md=768px) 기준이라 스토리별로 창 폭을 달리 감싼다
const Frame = ({ children, width }: { children: ReactNode; width: number }) => (
  <div style={{ border: "1px solid rgb(216 220 228)", height: 480, width }}>{children}</div>
);

const meta = {
  title: "Window/Folder/FolderViewerUI",
  component: FolderViewerUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "폴더 창 본문의 흰 배경 탐색기 레이아웃 — WindowFrameUI 안에서 " +
          "FolderSidebarUI(sidebar 슬롯, 창 폭 @md 이상)와 FolderFileGridUI/FolderFileCardUI(children)를 배치한다. " +
          "카테고리/파일/정렬 context menu 조립은 앱 레이어 몫이다.",
      },
    },
  },
} satisfies Meta<typeof FolderViewerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Frame width={900}>
      <FolderViewerUI sidebar={Sidebar}>
        <FolderFileGridUI viewMode="middle">
          {FILES.map((file) => (
            <FolderFileCardUI
              key={file.id}
              cover={<MockCover hue={file.hue} />}
              title={file.title}
            />
          ))}
        </FolderFileGridUI>
      </FolderViewerUI>
    </Frame>
  ),
};

export const SmallViewMode: Story = {
  render: () => (
    <Frame width={900}>
      <FolderViewerUI sidebar={Sidebar}>
        <FolderFileGridUI viewMode="small">
          {FILES.map((file) => (
            <FolderFileCardUI
              key={file.id}
              cover={<MockCover hue={file.hue} />}
              title={file.title}
            />
          ))}
        </FolderFileGridUI>
      </FolderViewerUI>
    </Frame>
  ),
};

/** 창 폭이 좁으면(@md 미만) 사이드바가 숨는다 */
export const NarrowWindow: Story = {
  render: () => (
    <Frame width={420}>
      <FolderViewerUI sidebar={Sidebar}>
        <FolderFileGridUI viewMode="small">
          {FILES.map((file) => (
            <FolderFileCardUI
              key={file.id}
              cover={<MockCover hue={file.hue} />}
              title={file.title}
            />
          ))}
        </FolderFileGridUI>
      </FolderViewerUI>
    </Frame>
  ),
};
