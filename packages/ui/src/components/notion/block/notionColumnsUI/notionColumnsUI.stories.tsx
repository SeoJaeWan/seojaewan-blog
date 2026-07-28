import type { Meta, StoryObj } from "@storybook/react-vite";

import { NotionColumnsUI } from "./index";

const Column = ({ body, title }: { body: string; title: string }) => (
  <>
    <h3 className="wb-notion-content__heading wb-notion-content__heading--3">{title}</h3>
    <p className="wb-notion-content__paragraph">{body}</p>
  </>
);

const meta = {
  title: "Notion/Block/NotionColumnsUI",
  component: NotionColumnsUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 컬럼 레이아웃(column_list). 데스크톱에서 균등 폭 가로 배치, 좁은 화면에서 " +
          "세로로 쌓는다. 컬럼 비율은 공식 API가 제공하지 않아 균등 분할만 지원한다. " +
          "컬럼 내용은 NotionContentUI가 렌더해서 slot으로 내려준다.",
      },
    },
  },
  args: { columns: [] },
  decorators: [
    (Story) => (
      <div className="wb-notion-content">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionColumnsUI>;

export default meta;

type Story = StoryObj<typeof meta>;

export const TwoColumns: Story = {
  render: () => (
    <NotionColumnsUI
      columns={[
        <Column
          body="공식 + 비공식 API 이중 파이프라인으로 같은 본문을 두 번 전송했다."
          key="left"
          title="원본 구조"
        />,
        <Column
          body="공식 API 단일화 + sync 자산화로 요청 시점 Notion 의존을 없앤다."
          key="right"
          title="새 구조"
        />,
      ]}
    />
  ),
};

export const ThreeColumns: Story = {
  render: () => (
    <NotionColumnsUI
      columns={[
        <Column body="블록 타입 인벤토리로 지원 스펙을 확정한다." key="a" title="1. 인벤토리" />,
        <Column body="ui notion 영역을 fixture로 먼저 검증한다." key="b" title="2. UI" />,
        <Column body="수집→매핑→자산화→커밋 파이프라인을 붙인다." key="c" title="3. Sync" />,
      ]}
    />
  ),
};
