import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon } from "../../../storyIcons";
import { ContextMenuButton } from "../../button/contextMenuButton";
import { ContextMenuPanel } from "../contextMenuPanel";
import { ContextMenuPositioner } from "./index";

const meta = {
  title: "Base/Menu/ContextMenuPositioner",
  component: ContextMenuPositioner,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Context Menu Panel을 전달받은 viewport inset에 고정하는 visual wrapper다. " +
          "각 Story는 계산이나 상호작용 없이 서로 다른 고정 위치만 보여 준다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof ContextMenuPositioner>;

export default meta;

type Story = StoryObj<typeof meta>;

const StaticMenu = () => (
  <ContextMenuPanel>
    <ContextMenuButton icon={<FileIcon />} label="파일 실행" />
    <ContextMenuButton icon={null} label="속성" />
  </ContextMenuPanel>
);

export const TopLeft: Story = {
  render: () => (
    <ContextMenuPositioner style={{ left: 24, top: 24 }}>
      <StaticMenu />
    </ContextMenuPositioner>
  ),
};

export const BottomRight: Story = {
  render: () => (
    <ContextMenuPositioner style={{ bottom: 24, right: 24 }}>
      <StaticMenu />
    </ContextMenuPositioner>
  ),
};
