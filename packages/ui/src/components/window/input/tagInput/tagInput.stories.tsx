import type { Meta, StoryObj } from "@storybook/react-vite";

import type { WindowTag } from "./index";
import { TagInput } from "./index";

const TAGS: WindowTag[] = [
  { color: "rgb(59 130 246)", name: "React" },
  { color: "rgb(16 185 129)", name: "성능" },
  { color: "rgb(245 101 101)", name: "회고" },
  { color: "rgb(168 85 247)", name: "디자인 시스템" },
  { color: "rgb(234 179 8)", name: "인프라" },
];

const meta = {
  title: "Window/Input/TagInput",
  component: TagInput,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "폴더 창 route 행 우측의 태그 필터 visual. open과 selectedTag를 고정 props로 받아 " +
          "닫힘, 선택됨, 열린 dropdown 상태를 직접 렌더링한다.",
      },
    },
  },
  args: {
    tags: TAGS,
  },
  decorators: [
    // route 행 우측 슬롯과 동일한 320x36 컨텍스트
    (Story) => (
      <div style={{ height: 36, width: 320 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TagInput>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithSelectedTag: Story = {
  args: { selectedTag: TAGS[0] },
};

export const Open: Story = {
  args: { open: true },
};
