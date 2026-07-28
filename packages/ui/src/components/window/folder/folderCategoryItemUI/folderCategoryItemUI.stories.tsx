import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import { FolderCategoryItemUI } from "./index";

const ITEMS = [
  { icon: <FileIcon />, id: "rsc", title: "React Server Components 정리" },
  { icon: <FileIcon />, id: "media-list", title: "미디어 리스트 속도 개선기" },
  { icon: <FileIcon />, id: "monorepo", title: "모노레포 디자인 시스템 구축" },
];

const meta = {
  title: "Window/Folder/FolderCategoryItemUI",
  component: FolderCategoryItemUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "폴더 창 sidebar의 category row와 하위 파일 목록 visual. expanded와 selected를 " +
          "고정 props로 받아 collapsed/expanded 상태를 직접 렌더링한다.",
      },
    },
  },
  args: {
    icon: <FolderIcon />,
    items: ITEMS,
    label: "블로그",
  },
  decorators: [
    (Story) => (
      <ul style={{ listStyle: "none", margin: 0, padding: 8, width: 260 }}>
        <Story />
      </ul>
    ),
  ],
} satisfies Meta<typeof FolderCategoryItemUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Collapsed: Story = {};

export const Expanded: Story = {
  args: { expanded: true, selected: true },
};
