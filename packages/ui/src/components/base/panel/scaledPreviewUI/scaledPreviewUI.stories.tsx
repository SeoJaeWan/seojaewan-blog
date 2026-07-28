import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import type { TaskHoverPanelItem } from "../../../taskbar/panel/taskHoverPanelUI";
import { TaskHoverPanelUI } from "../../../taskbar/panel/taskHoverPanelUI";
import { WindowControlsUI } from "../../../window/chrome/windowControlsUI";
import { WindowTabUI } from "../../../window/chrome/windowTabUI";
import { WindowTitleBarUI } from "../../../window/chrome/windowTitleBarUI";
import { FolderFileCardUI } from "../../../window/folder/folderFileCardUI";
import { FolderFileGridUI } from "../../../window/folder/folderFileGridUI";
import { FolderViewerUI } from "../../../window/folder/folderViewerUI";
import { WindowFrameUI } from "../../../window/windowFrameUI";
import { ScaledPreviewUI } from "./index";

const PREVIEW_SCALE_X = 0.1;
const PREVIEW_SCALE_Y = 0.11328125;

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
];

// hover preview 안의 창은 원본 isOverrideFullScreen처럼 1920x1024 캔버스를 가득 채운다
const PreviewWindow = () => (
  <WindowFrameUI
    overrideFullscreen
    titleBar={
      <WindowTitleBarUI controls={<WindowControlsUI />}>
        <WindowTabUI icon={<FolderIcon />} title="블로그" variant="folder" />
      </WindowTitleBarUI>
    }
    variant="folder"
  >
    <FolderViewerUI>
      <FolderFileGridUI viewMode="big">
        {FILES.map((file) => (
          <FolderFileCardUI key={file.id} cover={<MockCover hue={file.hue} />} title={file.title} />
        ))}
      </FolderFileGridUI>
    </FolderViewerUI>
  </WindowFrameUI>
);

const meta = {
  title: "Base/Panel/ScaledPreviewUI",
  component: ScaledPreviewUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "기준 캔버스(1920×1024)에 전달받은 X/Y scale을 적용해 창 화면을 축소 표현하는 미리보기 surface. " +
          "taskbar 앱 버튼 hover 시 뜨는 TaskHoverPanelUI의 preview 슬롯 등에서 " +
          "실제 세션 화면을 썸네일로 보여줄 때 쓴다.",
      },
    },
  },
} satisfies Meta<typeof ScaledPreviewUI>;

export default meta;

type Story = StoryObj<typeof meta>;

/** hover panel 썸네일과 같은 비율(4:3 - 타이틀 행)의 축소 미리보기 */
export const Default: Story = {
  render: () => (
    <div style={{ height: 116, width: 192 }}>
      <ScaledPreviewUI scaleX={PREVIEW_SCALE_X} scaleY={PREVIEW_SCALE_Y}>
        <PreviewWindow />
      </ScaledPreviewUI>
    </div>
  ),
};

const HOVER_ITEMS: TaskHoverPanelItem[] = [
  {
    icon: <FolderIcon />,
    id: "blog",
    preview: (
      <ScaledPreviewUI scaleX={PREVIEW_SCALE_X} scaleY={PREVIEW_SCALE_Y}>
        <PreviewWindow />
      </ScaledPreviewUI>
    ),
    title: "블로그",
  },
  {
    icon: <FileIcon />,
    id: "blog-rsc",
    preview: (
      <ScaledPreviewUI scaleX={PREVIEW_SCALE_X} scaleY={PREVIEW_SCALE_Y}>
        <WindowFrameUI
          overrideFullscreen
          titleBar={
            <WindowTitleBarUI controls={<WindowControlsUI />}>
              <WindowTabUI
                icon={<FileIcon />}
                title="React Server Components 정리"
                variant="file"
              />
            </WindowTitleBarUI>
          }
          variant="file"
        >
          <div
            style={{
              background: "#ffffff",
              boxSizing: "border-box",
              height: "100%",
              padding: "48px 64px",
            }}
          >
            <h1 style={{ fontSize: 40, margin: "0 0 24px" }}>React Server Components 정리</h1>
            {Array.from({ length: 10 }, (_, index) => (
              <div
                key={index}
                style={{
                  background: "rgb(243 244 246)",
                  borderRadius: 6,
                  height: 20,
                  margin: "0 0 20px",
                  width: `${92 - (index % 4) * 14}%`,
                }}
              />
            ))}
          </div>
        </WindowFrameUI>
      </ScaledPreviewUI>
    ),
    title: "React Server Components 정리",
  },
];

/** TaskHoverPanelUI preview slot에 실제 창(WindowFrameUI)을 축소해 넣은 통합 예시 */
export const InTaskHoverPanel: Story = {
  render: () => <TaskHoverPanelUI items={HOVER_ITEMS} />,
};
