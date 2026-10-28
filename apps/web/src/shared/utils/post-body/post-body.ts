// 글 본문 블록의 모양이다. Notion 블록을 단순화했다. 서버(`content/`)가 원천을 검증해 내보내고, 브라우저(Chrome 글 화면)가
// 서버 경로에서 받은 본문을 다시 검증해 그린다. 두 쪽이 같은 스키마를 써서 shared에 둔다.

import { z } from 'zod';

/**
 * 글자 서식. Notion의 굵게·기울임·밑줄·취소선·인라인 코드다. 없는 서식은 빼도 된다.
 * Notion 색 지정(글자색, 형광펜)은 따르지 않으므로 받지 않는다([[Chrome:Notion 블록]]).
 */
export const richTextAnnotationsSchema = z.object({
  /** 굵게 */
  bold: z.boolean().optional(),
  /** 기울임 */
  italic: z.boolean().optional(),
  /** 밑줄 */
  underline: z.boolean().optional(),
  /** 취소선 */
  strikethrough: z.boolean().optional(),
  /** 인라인 코드 */
  code: z.boolean().optional(),
});

/** 글자 서식 */
export type RichTextAnnotations = z.infer<typeof richTextAnnotationsSchema>;

/** 글자 조각 하나. 링크가 있으면 그 주소다(블로그 글 주소나 외부 주소) */
export const richTextSchema = z.object({
  /** 글자 */
  text: z.string(),
  /** 링크 주소. 없으면 null */
  link: z.string().min(1).nullable(),
  /** 글자 서식. 없으면 서식 없는 글자다 */
  annotations: richTextAnnotationsSchema.optional(),
});

/** 글자 조각 하나 */
export type RichText = z.infer<typeof richTextSchema>;

/** 코드 강조 색의 이름. 디자인 시스템 `code-syntax/*` 토큰 이름과 같다 */
export const CODE_SYNTAXES = [
  'attribute',
  'comment',
  'constant',
  'function',
  'keyword',
  'keyword-control',
  'parameter',
  'punctuation',
  'string',
  'tag',
  'text',
  'type',
  'variable',
] as const;

/** 코드 강조 색의 이름 */
export type CodeSyntax = (typeof CODE_SYNTAXES)[number];

/** 강조된 코드의 글자 조각 하나. 색이 없으면 기본 코드 글자색이다 */
export const codeTokenSchema = z.object({
  /** 글자 */
  text: z.string(),
  /** 강조 색. 없으면 null */
  syntax: z.enum(CODE_SYNTAXES).nullable(),
});

/** 강조된 코드의 글자 조각 하나 */
export type CodeToken = z.infer<typeof codeTokenSchema>;

/** 제목 블록 */
export type HeadingBlock = {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  richText: RichText[];
};

/** 목록 항목 블록(글머리·번호·할 일). 들여쓴 하위 블록을 가질 수 있다 */
export type ListItemBlock =
  | { type: 'bulleted_list_item'; richText: RichText[]; children?: PostBlock[] }
  | { type: 'numbered_list_item'; richText: RichText[]; children?: PostBlock[] }
  | { type: 'to_do'; richText: RichText[]; checked: boolean; children?: PostBlock[] };

/**
 * 본문 블록 하나. 이름은 Notion 블록 종류와 같다. `unsupported`는 지원하지 않는 블록 자리이고 Notion 유형 이름을 담는다.
 * 코드 블록의 강조(`highlighted`)와 수식은 서버가 본문을 만들 때 처리해 보낸다([[기술 스택:글 본문 처리]]).
 * 이미지 주소는 [[Notion 이미지 제공]]의 주소다.
 */
export type PostBlock =
  | HeadingBlock
  | ListItemBlock
  | { type: 'paragraph'; richText: RichText[] }
  | { type: 'quote'; richText: RichText[] }
  | { type: 'callout'; richText: RichText[] }
  | { type: 'code'; language: string; code: string; highlighted?: CodeToken[][] }
  | { type: 'image'; url: string; caption: RichText[] }
  | { type: 'divider' }
  | { type: 'toggle'; richText: RichText[]; children?: PostBlock[] }
  | { type: 'table'; hasColumnHeader: boolean; rows: RichText[][][] }
  | { type: 'bookmark'; url: string; title: string; description: string }
  | { type: 'equation'; expression: string }
  | { type: 'unsupported'; typeName: string };

const richTextsSchema = z.array(richTextSchema);
const childrenSchema = z.array(z.lazy(() => postBlockSchema)).optional();

/**
 * 본문 블록 하나의 스키마. [[Chrome:Notion 블록]]의 지원 블록과, 지원하지 않는 블록 자리(`unsupported`)를 받는다.
 * 목록·할 일·토글은 하위 블록을 가져 스키마가 스스로를 가리킨다.
 * @codocs [[Chrome:Notion 블록]]
 */
export const postBlockSchema: z.ZodType<PostBlock> = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading_1'), richText: richTextsSchema.min(1) }),
  z.object({ type: z.literal('heading_2'), richText: richTextsSchema.min(1) }),
  z.object({ type: z.literal('heading_3'), richText: richTextsSchema.min(1) }),
  z.object({ type: z.literal('paragraph'), richText: richTextsSchema }),
  z.object({
    type: z.literal('bulleted_list_item'),
    richText: richTextsSchema,
    children: childrenSchema,
  }),
  z.object({
    type: z.literal('numbered_list_item'),
    richText: richTextsSchema,
    children: childrenSchema,
  }),
  z.object({
    type: z.literal('to_do'),
    richText: richTextsSchema,
    checked: z.boolean(),
    children: childrenSchema,
  }),
  z.object({ type: z.literal('quote'), richText: richTextsSchema }),
  z.object({ type: z.literal('callout'), richText: richTextsSchema }),
  z.object({
    type: z.literal('code'),
    language: z.string().min(1),
    code: z.string(),
    highlighted: z.array(z.array(codeTokenSchema)).optional(),
  }),
  z.object({ type: z.literal('image'), url: z.string().min(1), caption: richTextsSchema }),
  z.object({ type: z.literal('divider') }),
  z.object({ type: z.literal('toggle'), richText: richTextsSchema, children: childrenSchema }),
  z.object({
    type: z.literal('table'),
    hasColumnHeader: z.boolean(),
    rows: z.array(z.array(richTextsSchema)),
  }),
  z.object({
    type: z.literal('bookmark'),
    url: z.string().min(1),
    title: z.string(),
    description: z.string(),
  }),
  z.object({ type: z.literal('equation'), expression: z.string() }),
  z.object({ type: z.literal('unsupported'), typeName: z.string().min(1) }),
]);

/** 글 본문 */
export type PostBody = {
  /** 본문 블록 */
  blocks: PostBlock[];
};

/** 글 본문. 블록을 차례대로 담는다 */
export const postBodySchema: z.ZodType<PostBody> = z.object({
  /** 본문 블록 */
  blocks: z.array(postBlockSchema),
});

/** 목차를 보이는 제목 개수의 최소값([[Chrome:글 화면]]) */
export const TOC_MIN_HEADINGS = 1;

/** 목차 항목 하나 */
export type TocHeading = {
  /** 제목 요소의 id. 목차에서 그 제목으로 스크롤할 때 쓴다 */
  id: string;
  /** 제목 글자 */
  label: string;
};

/**
 * 블록이 제목인지 본다.
 * @param block 블록
 * @returns 제목이면 true
 */
export function isHeadingBlock(block: PostBlock): block is HeadingBlock {
  return block.type === 'heading_1' || block.type === 'heading_2' || block.type === 'heading_3';
}

/**
 * 제목 블록 요소의 id. 본문 안 차례로 만든다.
 * @param index 본문 안 블록 차례
 * @returns id
 */
export function getHeadingId(index: number): string {
  return `heading-${String(index)}`;
}

/**
 * 글자 조각을 이은 글자.
 * @param richText 글자 조각
 * @returns 글자
 */
export function getPlainText(richText: readonly RichText[]): string {
  return richText.map((part) => part.text).join('');
}

/**
 * 본문의 목차 항목. 제목(Heading)이 1개 이상일 때 목차를 보이므로, 제목이 없으면 빈 목록이다.
 * @codocs [[Chrome:글 화면]]
 * @param blocks 본문 블록
 * @returns 목차 항목
 */
export function getTocHeadings(blocks: readonly PostBlock[]): TocHeading[] {
  const headings = blocks.flatMap((block, index) =>
    isHeadingBlock(block) ? [{ id: getHeadingId(index), label: getPlainText(block.richText) }] : [],
  );
  return headings.length >= TOC_MIN_HEADINGS ? headings : [];
}
