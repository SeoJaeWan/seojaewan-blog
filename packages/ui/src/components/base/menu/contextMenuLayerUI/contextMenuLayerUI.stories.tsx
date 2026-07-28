import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import { ContextMenuButtonUI } from "../../button/contextMenuButtonUI";
import { ContextMenuPanelUI } from "../contextMenuPanelUI";
import { ContextMenuPositionerUI } from "../contextMenuPositionerUI";
import { ContextMenuLayerUI } from "./index";

const meta = {
  title: "Base/Menu/ContextMenuLayerUI",
  component: ContextMenuLayerUI,
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
} satisfies Meta<typeof ContextMenuLayerUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const WithMenu: Story = {
  render: () => (
    <ContextMenuLayerUI>
      <ContextMenuPositionerUI style={{ left: 24, top: 24 }}>
        <ContextMenuPanelUI>
          <ContextMenuButtonUI icon={<FileIcon />} label="파일 실행" />
          <ContextMenuButtonUI icon={<FolderIcon />} label="파일 위치 열기" />
          <ContextMenuButtonUI icon={null} label="속성" />
        </ContextMenuPanelUI>
      </ContextMenuPositionerUI>
    </ContextMenuLayerUI>
  ),
};
