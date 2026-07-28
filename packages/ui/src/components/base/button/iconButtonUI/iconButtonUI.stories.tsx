import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon, WindowsLogoIcon } from "../../../storyIcons";
import { IconButtonUI } from "./index";

const meta = {
  title: "Base/Button/IconButtonUI",
  component: IconButtonUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "아이콘 + 접근성 라벨을 가진 버튼 primitive. 단독보다는 DesktopIconUI(바탕화면 아이콘), " +
          "PanelIconButtonUI(패널 아이콘 버튼) 같은 상위 컴포넌트가 이 primitive 위에 " +
          "라벨 배치와 크기 규칙을 더해 만드는 기반이 된다.",
      },
    },
  },
  args: {
    "aria-label": "블로그",
    icon: <FolderIcon />,
    size: "lg",
  },
  argTypes: {
    size: {
      control: "inline-radio",
      options: ["sm", "md", "lg"],
    },
  },
} satisfies Meta<typeof IconButtonUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const File: Story = {
  args: {
    "aria-label": "게시글 열기",
    icon: <FileIcon />,
    size: "lg",
  },
};

export const WindowsStart: Story = {
  args: {
    "aria-label": "시작",
    icon: <WindowsLogoIcon />,
    size: "lg",
  },
};

export const Selected: Story = {
  args: {
    "aria-label": "프로젝트",
    icon: <FolderIcon />,
    selected: true,
  },
};

export const Disabled: Story = {
  args: {
    "aria-label": "비활성 게시글",
    disabled: true,
    icon: <FileIcon />,
  },
};

export const Sizes: Story = {
  args: {
    "aria-label": "프로젝트",
  },
  render: (args) => (
    <div style={{ alignItems: "center", display: "flex", gap: 12 }}>
      <IconButtonUI {...args} aria-label="작은 폴더" icon={<FolderIcon />} size="sm" />
      <IconButtonUI {...args} aria-label="기본 폴더" icon={<FolderIcon />} size="md" />
      <IconButtonUI {...args} aria-label="큰 폴더" icon={<FolderIcon />} size="lg" />
    </div>
  ),
};

export const AsChild: Story = {
  args: {
    asChild: true,
    children: <a href="#icon-button-story" />,
  },
};
