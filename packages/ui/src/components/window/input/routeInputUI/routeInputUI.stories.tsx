import type { Meta, StoryObj } from "@storybook/react-vite";

import { FileIcon, FolderIcon } from "../../../storyIcons";
import { RouteInputUI } from "./index";

const SUGGESTIONS = [
  { icon: <FileIcon />, id: "rsc", title: "React Server Components 정리" },
  { icon: <FileIcon />, id: "media-list", title: "미디어 리스트 속도 개선기" },
  { icon: <FileIcon />, id: "monorepo", title: "모노레포 디자인 시스템 구축" },
];

const meta = {
  title: "Window/Input/RouteInputUI",
  component: RouteInputUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "폴더/파일 창 route 행의 Windows 탐색기 주소창 visual. editing과 suggestion 값을 " +
          "직접 받아 기본/편집/빈 결과 상태를 렌더링하며 focus 정책은 기능 계층이 연결한다.",
      },
    },
  },
  args: {
    defaultValue: "블로그",
    icon: <FolderIcon />,
    suggestions: SUGGESTIONS,
    variant: "folder",
  },
  decorators: [
    // route 행과 동일한 36px 높이 컨텍스트
    (Story) => (
      <div style={{ display: "flex", height: 36, width: 480 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof RouteInputUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Folder: Story = {};

export const File: Story = {
  args: {
    defaultValue: "React Server Components 정리",
    icon: <FileIcon />,
    variant: "file",
  },
};

export const Editing: Story = {
  args: { editing: true },
};

export const EmptySuggestions: Story = {
  args: {
    editing: true,
    suggestions: [],
  },
};
