import type { Meta, StoryObj } from "@storybook/react-vite";

import { NotionToggleUI } from "./index";

const meta = {
  title: "Notion/Block/NotionToggleUI",
  component: NotionToggleUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 토글 블록. native details/summary로 접기/펼치기를 제공하고 화살표 " +
          "마커를 Notion처럼 회전시킨다. 자식 블록은 NotionContentUI가 렌더해서 slot으로 " +
          "내려준다 — 원본 프로젝트에서 소실되던 토글 내부 콘텐츠가 이 slot으로 복원된다.",
      },
    },
  },
  args: {
    richText: [{ text: "번들 크기를 줄인 방법 펼쳐보기" }],
  },
  decorators: [
    (Story) => (
      <div className="wb-notion-content">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionToggleUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: (args) => (
    <NotionToggleUI {...args}>
      <p className="wb-notion-content__paragraph">
        토글을 열면 이 자식 블록이 나타난다. 문단뿐 아니라 코드/리스트도 들어올 수 있다.
      </p>
    </NotionToggleUI>
  ),
};

/** 처음부터 펼친 상태 — 문서/스토리 확인용 */
export const DefaultOpen: Story = {
  args: { defaultOpen: true },
  render: (args) => (
    <NotionToggleUI {...args}>
      <p className="wb-notion-content__paragraph">defaultOpen이면 펼친 채로 시작한다.</p>
    </NotionToggleUI>
  ),
};

/** 자식이 없으면 마커를 흐리게 — 열어도 내용 없음 */
export const Empty: Story = {
  args: { richText: [{ text: "자식 블록이 없는 토글" }] },
};
