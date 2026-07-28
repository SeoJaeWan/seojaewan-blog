import type { Meta, StoryObj } from "@storybook/react-vite";

import { NotionCalloutUI } from "./index";

const meta = {
  title: "Notion/Block/NotionCalloutUI",
  component: NotionCalloutUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 콜아웃 블록. 배경색 계열(*_background 또는 색 미지정)은 채운 박스, " +
          "텍스트색 계열은 테두리 박스로 그린다 — Notion과 동일한 분기. 자식 블록은 " +
          "NotionContentUI가 렌더해서 slot으로 내려준다.",
      },
    },
  },
  args: {
    richText: [
      { text: "이 글은 " },
      { annotations: { code: true }, text: "pnpm 10" },
      { text: " 기준으로 작성했습니다." },
    ],
  },
  decorators: [
    (Story) => (
      <div className="wb-notion-content">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionCalloutUI>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 색 미지정 — 기본 회색 배경 */
export const Default: Story = {};

/** 배경색 계열 — 채운 박스 */
export const Backgrounds: Story = {
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <NotionCalloutUI {...args} color="blue_background" icon="ℹ️" />
      <NotionCalloutUI {...args} color="yellow_background" icon="⚠️" />
      <NotionCalloutUI {...args} color="red_background" icon="🚨" />
    </div>
  ),
};

/** 텍스트색 계열 — 테두리 박스로 전환 */
export const PlainColor: Story = {
  args: { color: "orange", icon: "📌" },
};

/** 자식 블록 slot — NotionContentUI가 렌더한 내용이 본문 아래로 이어진다 */
export const WithChildren: Story = {
  args: { icon: "🧭" },
  render: (args) => (
    <NotionCalloutUI {...args}>
      <p className="wb-notion-content__paragraph">
        콜아웃 안에 문단, 리스트, 코드 블록 같은 자식 블록이 들어올 수 있다.
      </p>
    </NotionCalloutUI>
  ),
};
