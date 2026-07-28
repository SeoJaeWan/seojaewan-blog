import type { Meta, StoryObj } from "@storybook/react-vite";

import type { NotionColor, NotionRichTextSpan } from "../types";
import { NotionRichTextUI } from "./index";

const meta = {
  title: "Notion/NotionRichTextUI",
  component: NotionRichTextUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 본문의 인라인 텍스트 렌더러. annotation(bold/italic/code/취소선/밑줄)과 " +
          "텍스트 색/배경색, 링크를 중첩 엘리먼트로 조립한다. NotionContentUI와 블록 컴포넌트 " +
          "(callout, table, image 캡션 등)가 텍스트를 그릴 때 전부 이 컴포넌트를 공유한다.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div className="wb-notion-content">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionRichTextUI>;

export default meta;

type Story = StoryObj<typeof meta>;

/** annotation 조합 — 매퍼가 rich_text 배열을 span 단위로 넘긴다 */
export const Annotations: Story = {
  args: {
    spans: [
      { text: "일반 텍스트, " },
      { annotations: { bold: true }, text: "굵게" },
      { text: ", " },
      { annotations: { italic: true }, text: "기울임" },
      { text: ", " },
      { annotations: { code: true }, text: "inline code" },
      { text: ", " },
      { annotations: { strikethrough: true }, text: "취소선" },
      { text: ", " },
      { annotations: { underline: true }, text: "밑줄" },
      { text: ", " },
      { annotations: { bold: true, italic: true }, text: "굵은 기울임" },
      { text: ", 그리고 " },
      { href: "https://seojaewan.com", text: "링크" },
      { text: "." },
    ],
  },
};

const TEXT_COLORS: NotionColor[] = [
  "gray",
  "brown",
  "orange",
  "yellow",
  "green",
  "blue",
  "purple",
  "pink",
  "red",
];

/** Notion 팔레트 — 텍스트 색 9종과 배경색 9종 */
export const Colors: Story = {
  args: { spans: [] },
  render: () => {
    const textSpans: NotionRichTextSpan[] = TEXT_COLORS.flatMap((color) => [
      { color, text: color },
      { text: " " },
    ]);
    const backgroundSpans: NotionRichTextSpan[] = TEXT_COLORS.flatMap((color) => [
      { color: `${color}_background` as NotionColor, text: `${color} 배경` },
      { text: " " },
    ]);

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0 }}>
          <NotionRichTextUI spans={textSpans} />
        </p>
        <p style={{ margin: 0 }}>
          <NotionRichTextUI spans={backgroundSpans} />
        </p>
      </div>
    );
  },
};
