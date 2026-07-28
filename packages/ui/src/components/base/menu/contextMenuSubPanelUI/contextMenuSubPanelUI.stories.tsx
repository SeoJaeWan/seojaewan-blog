import type { CSSProperties } from "react";

import {
  ArrowSort20Regular,
  ChevronRight16Regular,
  GridDots20Regular,
  TextColumnThree20Regular,
  TextColumnTwo20Regular,
} from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContextMenuButtonUI } from "../../button/contextMenuButtonUI";
import { ContextMenuPanelUI } from "../contextMenuPanelUI";
import type { ContextMenuSubPanelPlacement } from "./index";
import { ContextMenuSubPanelUI } from "./index";

const dividerStyle: CSSProperties = {
  background: "rgb(229 231 235 / 0.5)",
  height: 1,
  margin: "2px 4px",
};

const rightTopPlacement: ContextMenuSubPanelPlacement = {
  right: 0,
  top: 0,
  transform: "translateX(100%)",
};

const leftBottomPlacement: ContextMenuSubPanelPlacement = {
  bottom: 0,
  left: 0,
  transform: "translateX(-100%)",
};

interface SortMenuPreviewProps {
  placement: ContextMenuSubPanelPlacement;
}

/** open과 placement가 고정된 정적 서브 메뉴 조합을 보여준다. */
const SortMenuPreview = ({ placement }: SortMenuPreviewProps) => (
  <ContextMenuPanelUI>
    <ContextMenuButtonUI
      asChild
      icon={<ArrowSort20Regular />}
      label="정렬 기준"
      trailing={<ChevronRight16Regular />}
    >
      <div>
        <ContextMenuSubPanelUI open placement={placement}>
          <ContextMenuButtonUI icon={null} label="제목" />
          <ContextMenuButtonUI icon={null} label="작성한 날짜" selected />
          <div style={dividerStyle} />
          <ContextMenuButtonUI icon={<TextColumnTwo20Regular />} label="오름차순" />
          <ContextMenuButtonUI icon={<TextColumnThree20Regular />} label="내림차순" selected />
          <ContextMenuButtonUI icon={<GridDots20Regular />} label="사용자 지정" />
        </ContextMenuSubPanelUI>
      </div>
    </ContextMenuButtonUI>
  </ContextMenuPanelUI>
);

const meta = {
  title: "Base/Menu/ContextMenuSubPanelUI",
  component: ContextMenuSubPanelUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "컨텍스트 메뉴 row 옆에 표시되는 서브 메뉴 surface. open과 placement 값을 직접 받아 " +
          "오른쪽/top 또는 왼쪽/bottom 같은 visual 상태를 정적으로 렌더링한다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
  },
} satisfies Meta<typeof ContextMenuSubPanelUI>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 열린 panel이 부모 오른쪽/top을 기준으로 배치된 visual 상태 */
export const OpenRightTop: Story = {
  render: () => (
    <div style={{ minHeight: 280, padding: 16 }}>
      <SortMenuPreview placement={rightTopPlacement} />
    </div>
  ),
};

/** 열린 panel이 부모 왼쪽/bottom을 기준으로 배치된 visual 상태 */
export const OpenLeftBottom: Story = {
  render: () => (
    <div
      style={{
        alignItems: "flex-end",
        display: "flex",
        justifyContent: "flex-end",
        minHeight: 280,
        padding: 16,
      }}
    >
      <SortMenuPreview placement={leftBottomPlacement} />
    </div>
  ),
};
