import { FolderOpen20Regular, Pin20Regular } from "@fluentui/react-icons";
import type { Meta, StoryObj } from "@storybook/react-vite";

import { ContextMenuButton } from "./index";

const meta = {
  title: "Base/Button/ContextMenuButton",
  component: ContextMenuButton,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "컨텍스트 메뉴의 액션 row 하나 — 아이콘 + 라벨(+ trailing 슬롯) 구성. " +
          "ContextMenuPanel/ContextMenuSubPanel 안에 나열되어 우클릭 메뉴의 각 항목이 되고, " +
          "asChild로 서브 메뉴를 여는 trigger row로도 쓴다.",
      },
    },
  },
  args: {
    icon: <Pin20Regular />,
    label: "작업 표시줄에 고정",
  },
} satisfies Meta<typeof ContextMenuButton>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  args: {
    selected: true,
  },
};

export const AsChild: Story = {
  args: {
    asChild: true,
    children: <a href="#context-menu-link" />,
    icon: <FolderOpen20Regular />,
    label: "파일 위치 열기",
  },
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
};
