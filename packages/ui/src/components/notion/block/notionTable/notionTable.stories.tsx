import type { Meta, StoryObj } from "@storybook/react-vite";

import type { NotionRichTextSpan } from "../../types";
import { NotionTable } from "./index";

const cell = (text: string): NotionRichTextSpan[] => [{ text }];

const ROWS: NotionRichTextSpan[][][] = [
  [cell("항목"), cell("원본(neu-blog)"), cell("새 구현(window-blog)")],
  [cell("API"), cell("공식 + 비공식(TOKEN_V2)"), cell("공식 단일")],
  [cell("렌더"), [{ annotations: { code: true }, text: "react-notion-x" }], cell("NotionContent")],
  [cell("이미지"), cell("GitHub 수동 업로드"), cell("sync 자산화")],
];

const meta = {
  title: "Notion/Block/NotionTable",
  component: NotionTable,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 표 블록 — 원본 프로젝트에서 placeholder로 남아 있던 블록. " +
          "머리글 행/열은 Notion처럼 회색 배경으로 구분하고, 셀 텍스트는 NotionRichText로 " +
          "그린다. 넘치는 폭은 표 컨테이너가 가로 스크롤로 처리한다.",
      },
    },
  },
  args: { rows: ROWS },
  decorators: [
    (Story) => (
      <div className="wb-notion-content">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionTable>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 첫 행이 열 머리글 */
export const ColumnHeader: Story = {
  args: { hasColumnHeader: true },
};

/** 열 머리글 + 각 행의 첫 셀이 행 머리글 */
export const RowAndColumnHeader: Story = {
  args: { hasColumnHeader: true, hasRowHeader: true },
};

/** 머리글 없음 — 모든 셀이 본문 */
export const NoHeader: Story = {};
