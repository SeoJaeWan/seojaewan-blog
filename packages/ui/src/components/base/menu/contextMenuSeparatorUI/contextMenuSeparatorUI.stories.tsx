import { FolderOpen20Regular, Pin20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContextMenuButtonUI } from "../../button/contextMenuButtonUI";
import { ContextMenuUI } from "../contextMenuUI";
import { ContextMenuSeparatorUI } from "./index";

const meta = {
  title: "Base/Menu/ContextMenuSeparatorUI",
  component: ContextMenuSeparatorUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component: "Context Menu의 관련 action group 사이를 나누는 비대화형 수평 separator다.",
      },
      story: { iframeHeight: 240, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof ContextMenuSeparatorUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const BetweenActions: Story = {
  render: () => (
    <ContextMenuUI animated={false} position={{ left: 24, placement: "bottom", top: 24 }}>
      <ContextMenuButtonUI icon={<FolderOpen20Regular />} label="파일 위치 열기" />
      <ContextMenuSeparatorUI />
      <ContextMenuButtonUI icon={<Pin20Regular />} label="시작 화면에 고정" />
    </ContextMenuUI>
  ),
};
