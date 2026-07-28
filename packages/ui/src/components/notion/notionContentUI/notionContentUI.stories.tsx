import type { Meta, StoryObj } from "@storybook/react-vite";

import windowsWallpaperSrc from "../../../assets/windows.webp";
import type { NotionBlockNode } from "../types";
import { NotionContentUI } from "./index";

// 지원 블록 전체를 관통하는 블로그 글 fixture — sync 매퍼가 만들 블록 트리의 예시
const FULL_POST: NotionBlockNode[] = [
  {
    level: 1,
    richText: [{ text: "모노레포 디자인 시스템 구축" }],
    type: "heading",
  },
  {
    richText: [
      { text: "Windows 11 데스크톱 UI를 " },
      { annotations: { bold: true }, text: "디자인 시스템" },
      { text: "으로 다시 구축하면서 정리한 기록. 원본 프로젝트는 " },
      { href: "https://seojaewan.com", text: "seojaewan.com" },
      { text: "에 배포되어 있다." },
    ],
    type: "paragraph",
  },
  {
    color: "blue_background",
    icon: "ℹ️",
    richText: [
      { text: "이 글의 코드는 " },
      { annotations: { code: true }, text: "pnpm 10" },
      { text: " + " },
      { annotations: { code: true }, text: "React 19" },
      { text: " 기준으로 작성했다." },
    ],
    type: "callout",
  },
  {
    level: 2,
    richText: [{ text: "왜 다시 만들었나" }],
    type: "heading",
  },
  {
    items: [
      {
        children: [
          {
            items: [
              { richText: [{ text: "상태와 코드 관리가 꼬여 있던 문제" }] },
              { richText: [{ text: "공식/비공식 API 이중 파이프라인" }] },
            ],
            type: "bulletedList",
          },
        ],
        richText: [
          { annotations: { bold: true }, text: "구조 문제" },
          { text: "가 누적되어 있었다" },
        ],
      },
      {
        richText: [
          { text: "디자인 시스템을 " },
          { color: "orange", text: "패키지로 분리" },
          { text: "해 Storybook에서 독립 검증하고 싶었다" },
        ],
      },
    ],
    type: "bulletedList",
  },
  {
    items: [
      { richText: [{ text: "블록 타입 인벤토리로 지원 스펙 확정" }] },
      { richText: [{ text: "ui notion 영역을 fixture로 먼저 검증" }] },
      { richText: [{ text: "sync 파이프라인(수집 → 매핑 → 자산화 → 커밋) 연결" }] },
    ],
    type: "numberedList",
  },
  {
    richText: [{ text: "설계 결정 자세히 보기" }],
    type: "toggle",
    children: [
      {
        richText: [
          { text: "ui는 " },
          { annotations: { code: true }, text: "@notionhq/client" },
          { text: "에 의존하지 않고 자체 블록 union 타입을 계약으로 선언한다." },
        ],
        type: "paragraph",
      },
      {
        code: 'export type NotionBlockNode =\n  | { type: "paragraph"; richText: NotionRichTextSpan[] }\n  | { type: "callout"; icon?: string; /* ... */ };',
        language: "typescript",
        type: "code",
      },
    ],
  },
  {
    caption: "매퍼가 살게 될 sync 단계의 골격",
    code: 'const toNode = (block: BlockObjectResponse): NotionBlockNode => {\n  switch (block.type) {\n    case "callout":\n      return { type: "callout", /* ... */ };\n  }\n};',
    language: "typescript",
    type: "code",
  },
  {
    alt: "Windows 11 기본 배경화면",
    caption: [{ text: "이미지 src는 sync 단계에서 자산화된 경로로 교체된다" }],
    src: windowsWallpaperSrc,
    type: "image",
  },
  {
    hasColumnHeader: true,
    rows: [
      [[{ text: "항목" }], [{ text: "원본" }], [{ text: "새 구현" }]],
      [[{ text: "API" }], [{ text: "공식 + 비공식" }], [{ text: "공식 단일" }]],
      [[{ text: "이미지" }], [{ text: "수동 업로드" }], [{ text: "sync 자산화" }]],
    ],
    type: "table",
  },
  {
    columns: [
      [
        { level: 3, richText: [{ text: "Before" }], type: "heading" },
        { richText: [{ text: "recordMap 수백 KB를 창마다 전송했다." }], type: "paragraph" },
      ],
      [
        { level: 3, richText: [{ text: "After" }], type: "heading" },
        { richText: [{ text: "블록 트리 JSON만 전송한다." }], type: "paragraph" },
      ],
    ],
    type: "columnList",
  },
  {
    color: "gray",
    richText: [{ text: "구조가 의존 방향을 시각화하게 하라 — 폴더가 곧 규칙이다." }],
    type: "quote",
  },
  { expression: "E = mc^2", type: "equation" },
  { type: "divider" },
  {
    color: "gray",
    richText: [{ text: "2026-07-05 · window-blog 개발 기록" }],
    type: "paragraph",
  },
];

const meta = {
  title: "Notion/NotionContentUI",
  component: NotionContentUI,
  tags: ["autodocs"],
  parameters: {
    docs: {
      description: {
        component:
          "Notion 본문 렌더러이자 notion 영역의 루트. sync 레이어 매퍼가 만든 블록 트리 " +
          "(NotionBlockNode[])를 받아 블록 타입별 컴포넌트로 매핑한다 — 원본의 " +
          "react-notion-x + dangerouslySetInnerHTML 이중 렌더를 대체한다. 자식 블록 재귀와 " +
          "들여쓰기를 소유하고, code block 기능이 필요하면 renderCodeBlock slot으로 조립한다.",
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ margin: "0 auto", maxWidth: 720, padding: 24 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof NotionContentUI>;

export default meta;

type Story = StoryObj<typeof meta>;

/** v1 지원 블록 13종을 전부 관통하는 블로그 글 */
export const FullPost: Story = {
  args: { blocks: FULL_POST },
};

/** 중첩 — 문단/인용/콜아웃의 자식 블록 들여쓰기 */
export const Nested: Story = {
  args: {
    blocks: [
      {
        richText: [{ text: "부모 문단 — 아래 자식 블록이 들여쓰기로 이어진다." }],
        type: "paragraph",
        children: [
          { richText: [{ text: "자식 문단 1단계." }], type: "paragraph" },
          {
            richText: [{ text: "자식 인용 — 인용도 자식을 가질 수 있다." }],
            type: "quote",
            children: [{ richText: [{ text: "손자 문단 2단계." }], type: "paragraph" }],
          },
        ],
      },
    ],
  },
};
