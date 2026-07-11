import type { CSSProperties, ReactNode } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";

import { FolderIcon, GithubBrandIcon, LinkedInBrandIcon } from "../../storyIcons";
import type { DesktopViewMode } from "../desktopIconGrid";
import { DesktopIconGrid } from "../desktopIconGrid";
import { DesktopIcon } from "./index";

// DesktopIconGrid는 absolute inset-0 — 스토리에서는 relative 컨테이너로 감싼다
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
  title: "Desktop/DesktopIcon",
  component: DesktopIcon,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "바탕화면의 카테고리 폴더/외부 링크 아이콘 버튼 — IconButton primitive에 세로 라벨을 더했다. " +
          "DesktopIconGrid 안에 배치되어 크기는 grid의 viewMode(big/middle/small)가 결정하고, " +
          "열기(더블클릭)와 우클릭 메뉴는 onDoubleClick/onContextMenu로 앱에 위임한다.",
      },
    },
  },
} satisfies Meta<typeof DesktopIcon>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 카테고리 폴더와 외부 링크(brand asset)가 같은 컴포넌트를 쓴다 */
export const Default: Story = {
  args: { icon: <FolderIcon />, label: "블로그" },
  render: (args) => (
    <Surface>
      <DesktopIconGrid viewMode="middle">
        <DesktopIcon {...args} />
        <DesktopIcon icon={<LinkedInBrandIcon />} label="LinkedIn" />
        <DesktopIcon icon={<GithubBrandIcon />} label="Github" />
      </DesktopIconGrid>
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
          <DesktopIconGrid viewMode={mode}>
            <DesktopIcon icon={<FolderIcon />} label="블로그" />
            <DesktopIcon icon={<FolderIcon />} label="프로젝트" />
            <DesktopIcon icon={<FolderIcon />} label="코딩 테스트" />
            <DesktopIcon icon={<FolderIcon />} label="소개" />
          </DesktopIconGrid>
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
      <DesktopIconGrid viewMode="middle">
        <DesktopIcon {...args} />
      </DesktopIconGrid>
    </Surface>
  ),
};
