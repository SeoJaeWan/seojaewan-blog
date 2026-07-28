import type { CSSProperties, ReactNode } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon, GithubBrandIcon, LinkedInBrandIcon } from "../../storyIcons";
import type { DesktopViewMode } from "../desktopIconGridUI";
import { DesktopIconGridUI } from "../desktopIconGridUI";
import { DesktopIconUI } from "./index";

// DesktopIconGridUI는 absolute inset-0 — 스토리에서는 relative 컨테이너로 감싼다
const surfaceStyle: CSSProperties = {
  background: "linear-gradient(160deg, rgb(190 227 248), rgb(148 187 233))",
  borderRadius: 8,
  height: 128,
  position: "relative",
};

const Surface = ({ children, height = 128 }: { children: ReactNode; height?: number }) => (
  <div style={{ ...surfaceStyle, height }}>{children}</div>
);

const meta = {
  title: "Desktop/DesktopIconUI",
  component: DesktopIconUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "바탕화면의 카테고리 폴더/외부 링크 아이콘 버튼 — IconButtonUI primitive에 세로 라벨을 더했다. " +
          "DesktopIconGridUI 안에 배치되어 크기는 grid의 viewMode(big/middle/small)가 결정하고, " +
          "열기(더블클릭)와 우클릭 메뉴는 onDoubleClick/onContextMenu로 앱에 위임한다.",
      },
    },
  },
} satisfies Meta<typeof DesktopIconUI>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 카테고리 폴더와 외부 링크(brand asset)가 같은 컴포넌트를 쓴다 */
export const Default: Story = {
  args: { icon: <FolderIcon />, label: "블로그" },
  render: (args) => (
    <Surface>
      <DesktopIconGridUI viewMode="middle">
        <DesktopIconUI {...args} />
        <DesktopIconUI icon={<LinkedInBrandIcon />} label="LinkedIn" />
        <DesktopIconUI icon={<GithubBrandIcon />} label="Github" />
      </DesktopIconGridUI>
    </Surface>
  ),
};

const viewModes: DesktopViewMode[] = ["big", "middle", "small"];

/** viewMode별 크기: big 112px(icon 72) / middle 96px(icon 56) / small 80px(icon 48) */
export const ViewModes: Story = {
  args: { icon: <FolderIcon />, label: "블로그" },
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {viewModes.map((mode) => (
        <Surface height={mode === "big" ? 128 : mode === "middle" ? 112 : 96} key={mode}>
          <DesktopIconGridUI viewMode={mode}>
            <DesktopIconUI icon={<FolderIcon />} label="블로그" />
            <DesktopIconUI icon={<FolderIcon />} label="프로젝트" />
            <DesktopIconUI icon={<FolderIcon />} label="코딩 테스트" />
            <DesktopIconUI icon={<FolderIcon />} label="소개" />
          </DesktopIconGridUI>
        </Surface>
      ))}
    </div>
  ),
};

/** 긴 라벨은 한 줄에서 말줄임된다 */
export const LongLabel: Story = {
  args: { icon: <FolderIcon />, label: "아주 길어서 잘리는 바탕화면 아이콘 라벨" },
  render: (args) => (
    <Surface>
      <DesktopIconGridUI viewMode="middle">
        <DesktopIconUI {...args} />
      </DesktopIconGridUI>
    </Surface>
  ),
};
