import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import { ContextMenuButton } from "../../button/contextMenuButton";
import { ContextMenuPanel } from "../contextMenuPanel";
import { ContextMenuPositioner } from "../contextMenuPositioner";
import { ContextMenuLayer } from "./index";

const meta = {
  title: "Base/Menu/ContextMenuLayer",
  component: ContextMenuLayer,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Context Menu를 viewport 최상단에 표시하는 visual layer다. " +
          "Story에서는 동작 없이 고정된 Positioner와 Panel을 조립해 layer의 화면 구성을 보여 준다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
} satisfies Meta<typeof ContextMenuLayer>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithMenu: Story = {
  render: () => (
    <ContextMenuLayer>
      <ContextMenuPositioner style={{ left: 24, top: 24 }}>
        <ContextMenuPanel>
          <ContextMenuButton icon={<FileIcon />} label="파일 실행" />
          <ContextMenuButton icon={<FolderIcon />} label="파일 위치 열기" />
          <ContextMenuButton icon={null} label="속성" />
        </ContextMenuPanel>
      </ContextMenuPositioner>
    </ContextMenuLayer>
  ),
};
