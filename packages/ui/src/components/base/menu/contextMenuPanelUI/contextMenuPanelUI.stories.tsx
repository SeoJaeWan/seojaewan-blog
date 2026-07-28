import { FolderOpen20Regular, Pin20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon } from "../../../storyIcons";
import { ContextMenuButtonUI } from "../../button/contextMenuButtonUI";
import { ContextMenuPanelUI } from "./index";

const meta = {
  title: "Base/Menu/ContextMenuPanelUI",
  component: ContextMenuPanelUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "우클릭 컨텍스트 메뉴의 컨테이너 surface — ContextMenuButtonUI row들을 세로로 나열한다. " +
          "이 Story는 메뉴의 고정된 모양과 row 구성을 보여 주며 위치와 열림 상태는 다루지 않는다.",
      },
    },
  },
} satisfies Meta<typeof ContextMenuPanelUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <ContextMenuPanelUI>
      <ContextMenuButtonUI icon={<FileIcon />} label="파일 실행" />
      <ContextMenuButtonUI icon={<FolderOpen20Regular />} label="파일 위치 열기" />
      <ContextMenuButtonUI icon={<Pin20Regular />} label="시작 화면에 고정" />
      <ContextMenuButtonUI icon={<Pin20Regular />} label="작업 표시줄에 고정" />
    </ContextMenuPanelUI>
  ),
};
