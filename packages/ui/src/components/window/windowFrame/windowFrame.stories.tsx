import type { CSSProperties, ReactNode } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../storyIcons";
import { TaskbarIconButton } from "../../taskbar/button/taskbarIconButton";
import { WindowControls } from "../chrome/windowControls";
import { WindowRouteBar } from "../chrome/windowRouteBar";
import { WindowTab } from "../chrome/windowTab";
import { WindowTitleBar } from "../chrome/windowTitleBar";
import { FolderCategoryItem } from "../folder/folderCategoryItem";
import { FolderFileCard } from "../folder/folderFileCard";
import type { FolderViewMode } from "../folder/folderFileGrid";
import { FolderFileGrid } from "../folder/folderFileGrid";
import { FolderSidebar } from "../folder/folderSidebar";
import { FolderViewer } from "../folder/folderViewer";
import { RouteInput } from "../input/routeInput";
import type { WindowTag } from "../input/tagInput";
import { TagInput } from "../input/tagInput";
import type { WindowAnimation } from "./";
import type { WindowFrameBounds } from "./";
import { WindowFrame } from "./";

// WindowFrame은 원본처럼 position: fixed — 스토리에서는 transform이 있는
// 컨테이너로 감싸 fixed 기준을 컨테이너로 좁힌다
const desktopStyle: CSSProperties = {
  background: "linear-gradient(160deg, rgb(190 227 248), rgb(148 187 233) 55%, rgb(120 156 214))",
  height: 640,
  overflow: "hidden",
  position: "relative",
  transform: "translateZ(0)",
  width: 960,
};

const Desktop = ({ children }: { children: ReactNode }) => (
  <div style={desktopStyle}>
    {children}
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, rgb(255 255 255 / 0.25), rgb(35 181 230 / 0.1), rgb(173 216 230 / 0.2), rgb(35 181 230 / 0.15), rgb(0 0 0 / 0.05)), #ffffff",
        borderTop: "1px solid rgb(204 208 217)",
        bottom: 0,
        boxSizing: "border-box",
        display: "flex",
        height: 50,
        justifyContent: "center",
        left: 0,
        padding: "4px 0",
        position: "absolute",
        right: 0,
      }}
    >
      <TaskbarIconButton aria-label="블로그" icon={<FolderIcon />} state="active" />
    </div>
  </div>
);

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

const TAGS: WindowTag[] = [
  { color: "rgb(59 130 246)", name: "React" },
  { color: "rgb(16 185 129)", name: "성능" },
  { color: "rgb(245 101 101)", name: "회고" },
  { color: "rgb(168 85 247)", name: "디자인 시스템" },
];

const SUGGESTIONS = FILES.slice(0, 4).map((file) => ({
  icon: <FileIcon />,
  id: file.id,
  title: file.title,
}));

const FolderBody = ({ viewMode = "middle" }: { viewMode?: FolderViewMode }) => (
  <FolderViewer
    sidebar={
      <FolderSidebar>
        <FolderCategoryItem
          expanded
          icon={<FolderIcon />}
          items={BLOG_ITEMS}
          label="블로그"
          selected
        />
        <FolderCategoryItem icon={<FolderIcon />} label="프로젝트" />
        <FolderCategoryItem icon={<FolderIcon />} label="코딩 테스트" />
        <FolderCategoryItem icon={<FolderIcon />} label="소개" />
      </FolderSidebar>
    }
  >
    <FolderFileGrid viewMode={viewMode}>
      {FILES.map((file) => (
        <FolderFileCard key={file.id} cover={<MockCover hue={file.hue} />} title={file.title} />
      ))}
    </FolderFileGrid>
  </FolderViewer>
);

interface FolderWindowProps {
  animation?: WindowAnimation;
  bounds?: WindowFrameBounds;
  freezeAnimation?: boolean;
  fullscreen?: boolean;
  viewMode?: FolderViewMode;
}

const FolderWindow = ({
  animation = "none",
  bounds = { height: 500, left: 48, top: 36, width: 840 },
  freezeAnimation = false,
  fullscreen = false,
  viewMode,
}: FolderWindowProps) => (
  <WindowFrame
    animation={animation}
    bounds={bounds}
    fullscreen={fullscreen}
    routeBar={
      <WindowRouteBar
        canGoBack
        tag={<TagInput selectedTag={TAGS[0]} tags={TAGS} />}
        variant="folder"
      >
        <RouteInput
          defaultValue="블로그"
          icon={<FolderIcon />}
          suggestions={SUGGESTIONS}
          variant="folder"
        />
      </WindowRouteBar>
    }
    style={
      freezeAnimation
        ? {
            animationDelay: animation === "open" || animation === "restore" ? "-100ms" : "-75ms",
            animationPlayState: "paused",
          }
        : undefined
    }
    titleBar={
      <WindowTitleBar controls={<WindowControls fullscreen={fullscreen} />}>
        <WindowTab icon={<FolderIcon />} title="블로그" variant="folder" />
      </WindowTitleBar>
    }
    variant="folder"
  >
    <FolderBody viewMode={viewMode} />
  </WindowFrame>
);

const meta = {
  title: "Window/WindowFrame",
  component: WindowFrame,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "폴더/파일 창의 render-only 최상위 컨테이너. 전달받은 bounds, fullscreen, dragging, " +
          "animation 상태를 CSS로 표현한다. titleBar/routeBar 슬롯에 " +
          "WindowTitleBar/WindowRouteBar를 꽂아 창의 시각 구성을 확인한다.",
      },
      story: { iframeHeight: 700, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof WindowFrame>;

export default meta;

type Story = StoryObj<typeof meta>;

export const FolderWindowStory: Story = {
  name: "FolderWindow",
  args: { variant: "folder" },
  render: () => (
    <Desktop>
      <FolderWindow />
    </Desktop>
  ),
};

export const FileWindowStory: Story = {
  name: "FileWindow",
  args: { variant: "file" },
  render: () => (
    <Desktop>
      <WindowFrame
        bounds={{ height: 520, left: 120, top: 28, width: 720 }}
        routeBar={
          <WindowRouteBar canGoBack canGoForward variant="file">
            <RouteInput
              defaultValue="React Server Components 정리"
              icon={<FileIcon />}
              suggestions={SUGGESTIONS}
              variant="file"
            />
          </WindowRouteBar>
        }
        titleBar={
          <WindowTitleBar controls={<WindowControls />}>
            <WindowTab icon={<FileIcon />} title="React Server Components 정리" variant="file" />
          </WindowTitleBar>
        }
        variant="file"
      >
        {/* 파일 본문(react-notion-x)은 앱 영역 — 스크롤 컨테이너 목업 */}
        <div
          style={{
            background: "#ffffff",
            boxSizing: "border-box",
            height: "100%",
            overflowY: "auto",
            padding: "32px 48px",
          }}
        >
          <h1 style={{ fontSize: 24, margin: "0 0 16px" }}>React Server Components 정리</h1>
          {Array.from({ length: 12 }, (_, index) => (
            <div
              key={index}
              style={{
                background: "rgb(243 244 246)",
                borderRadius: 4,
                height: 12,
                margin: "0 0 12px",
                width: `${92 - (index % 4) * 14}%`,
              }}
            />
          ))}
        </div>
      </WindowFrame>
    </Desktop>
  ),
};

export const FullscreenWindowStory: Story = {
  name: "Fullscreen",
  args: { fullscreen: true, variant: "folder" },
  render: () => (
    <Desktop>
      <FolderWindow fullscreen />
    </Desktop>
  ),
};

const staticAnimationStory = (animation: Exclude<WindowAnimation, "none">): Story => ({
  args: { animation, variant: "folder" },
  render: () => (
    <Desktop>
      <FolderWindow animation={animation} freezeAnimation />
    </Desktop>
  ),
});

/** animation의 중간 visual을 고정해서 보여주는 정적 상태 Story. */
export const OpenAnimation = staticAnimationStory("open");
export const CloseAnimation = staticAnimationStory("close");
export const MinimizeAnimation = staticAnimationStory("minimize");
export const RestoreAnimation = staticAnimationStory("restore");
