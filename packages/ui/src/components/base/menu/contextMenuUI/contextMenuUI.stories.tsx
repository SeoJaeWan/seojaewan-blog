import { FolderOpen20Regular, Pin20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon } from "../../../storyIcons";
import { ContextMenuButtonUI } from "../../button/contextMenuButtonUI";
import type { ContextMenuPosition } from "./index";
import { ContextMenuUI } from "./index";

const belowPosition: ContextMenuPosition = {
  left: 24,
  placement: "bottom",
  top: 24,
};

const abovePosition: ContextMenuPosition = {
  bottom: 24,
  left: 24,
  placement: "top",
};

const menuRows = (
  <>
    <ContextMenuButtonUI icon={<FileIcon />} label="파일 실행" />
    <ContextMenuButtonUI icon={<FolderOpen20Regular />} label="파일 위치 열기" />
    <ContextMenuButtonUI icon={<Pin20Regular />} label="시작 화면에 고정" />
  </>
);

const meta = {
  title: "Base/Menu/ContextMenuUI",
  component: ContextMenuUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "viewport blocking layer, 위치 surface와 menu panel을 통합한 Context Menu visual이다. " +
          "배치 방향에 맞춰 opening Motion을 실행하며 상태, Portal과 좌표 계산은 외부에 위임한다.",
      },
      story: { iframeHeight: 360, inline: false },
    },
    layout: "fullscreen",
  },
  args: {
    animated: true,
    children: menuRows,
    position: belowPosition,
  },
} satisfies Meta<typeof ContextMenuUI>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 기준점 아래에서 위쪽을 기점으로 펼쳐지는 상태 */
export const Below: Story = {};

/** 기준점 위에서 아래쪽을 기점으로 펼쳐지는 상태 */
export const Above: Story = {
  args: {
    position: abovePosition,
  },
};

/** 검색 결과처럼 opening Motion 없이 바로 표시되는 상태 */
export const Immediate: Story = {
  args: {
    animated: false,
  },
};
