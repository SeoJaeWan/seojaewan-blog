// 글 본문 블록의 모양이다. Notion 블록을 단순화했다. 서버(`content/`)가 원천을 검증해 내보내고, 브라우저(Chrome 글 화면)가
// 서버 경로에서 받은 본문을 다시 검증해 그린다. 두 쪽이 같은 스키마를 써서 shared에 둔다.

import { z } from 'zod';

/**
 * 글자 서식. Notion의 굵게·기울임·밑줄·취소선·인라인 코드다. 없는 서식은 빼도 된다.
 * Notion 색 지정(글자색, 형광펜)은 따르지 않으므로 받지 않는다([[Notion 블록:모양]]).
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

/** 강조된 코드의 글자 조각 하나. 색이 없으면 기본 코드 글자색이다 */
export const codeTokenSchema = z.object({
  /** 글자 */
  text: z.string(),
  /** 강조기가 준 글자 색(hex). 없으면 null */
  color: z
    .string()
    .regex(/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/iu)
    .nullable(),
});

/** 강조된 코드의 글자 조각 하나 */
export type CodeToken = z.infer<typeof codeTokenSchema>;

/**
 * 글 이미지(본문 이미지와 커버). 주소는 [[Notion 이미지 제공:주소]]의 이미지 서버 주소이고, 크기는 이미지 서버가 알려준 폭과
 * 높이(픽셀)다. 이미지 서버가 답하지 않아 모르면 null이다([[Notion 이미지 제공:크기]]).
 * @codocs [[Notion 이미지 제공:크기]]
 */
export const postImageSchema = z.object({
  /** 이미지 주소 */
  url: z.string().min(1),
  /** 폭. 모르면 null */
  width: z.number().int().positive().nullable(),
  /** 높이. 모르면 null */
  height: z.number().int().positive().nullable(),
});

/** 글 이미지(본문 이미지와 커버) */
export type PostImage = z.infer<typeof postImageSchema>;

/** 제목 블록 */
export type HeadingBlock = {
  type: 'heading_1' | 'heading_2' | 'heading_3';
  richText: RichText[];
};

/** 목록 항목 블록(글머리·번호·할 일). 들여쓴 하위 블록을 가질 수 있다 */
export type ListItemBlock =
  | { type: 'bulleted_list_item'; richText: RichText[]; children?: PostBlock[] }
  | { type: 'numbered_list_item'; richText: RichText[]; children?: PostBlock[] }
  | { type: 'to_do'; richText: RichText[]; isChecked: boolean; children?: PostBlock[] };

/**
 * 본문 블록 하나. 이름은 Notion 블록 종류와 같다. `unsupported`는 지원하지 않는 블록 자리이고 Notion 유형 이름을 담는다.
 * 코드 블록의 강조(`highlighted`)와 수식 HTML(`html`, KaTeX)은 서버가 본문을 만들 때 처리해 보낸다([[기술 스택:글 본문 처리]]).
 * 이미지 주소는 [[Notion 이미지 제공]]의 주소이고, 폭·높이는 이미지 서버가 알려준 크기다(모르면 null).
 * `html`은 서버가 KaTeX로 그린 수식 HTML이며 그리지 못한 식이면 없다.
 * 열 나누기는 `column_list`가 열(`column`)들을 `children`으로 품고, 열은 Notion `width_ratio`(`widthRatio`, 없으면 null)와 안의 블록을 품는다.
 */
export type PostBlock =
  | HeadingBlock
  | ListItemBlock
  | { type: 'paragraph'; richText: RichText[] }
  | { type: 'quote'; richText: RichText[] }
  | { type: 'callout'; richText: RichText[] }
  | { type: 'code'; language: string; code: string; highlighted?: CodeToken[][] }
  | ({ type: 'image'; caption: RichText[] } & PostImage)
  | { type: 'divider' }
  | { type: 'toggle'; richText: RichText[]; children?: PostBlock[] }
  | { type: 'table'; hasColumnHeader: boolean; rows: RichText[][][] }
  | { type: 'bookmark'; url: string; title: string; description: string }
  | {
      type: 'equation';
      expression: string;
      html?: string;
    }
  | { type: 'column_list'; children: PostBlock[] }
  | { type: 'column'; widthRatio: number | null; children: PostBlock[] }
  | { type: 'unsupported'; typeName: string };

const richTextsSchema = z.array(richTextSchema);
const childrenSchema = z.array(z.lazy(() => postBlockSchema)).optional();

/**
 * 본문 블록 하나의 스키마. [[Notion 블록:지원 블록]]의 지원 블록과, 지원하지 않는 블록 자리(`unsupported`)를 받는다.
 * 목록·할 일·토글은 하위 블록을 가져 스키마가 스스로를 가리킨다.
 * @codocs [[Notion 블록:지원 블록]]
 * @codocs [[Notion 블록:지원하지 않는 블록]]
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
    isChecked: z.boolean(),
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
  postImageSchema.extend({ type: z.literal('image'), caption: richTextsSchema }),
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
  z.object({ type: z.literal('equation'), expression: z.string(), html: z.string().optional() }),
  z.object({ type: z.literal('column_list'), children: z.array(z.lazy(() => postBlockSchema)) }),
  z.object({
    type: z.literal('column'),
    widthRatio: z.number().positive().nullable(),
    children: z.array(z.lazy(() => postBlockSchema)),
  }),
  z.object({ type: z.literal('unsupported'), typeName: z.string().min(1) }),
]);

/** 글 본문. 커버는 Notion 페이지 커버이고 없으면 null이다 */
export type PostBody = {
  blocks: PostBlock[];
  cover: PostImage | null;
};

/** 글 본문. 블록을 차례대로 담고, 커버가 있으면 함께 담는다 */
export const postBodySchema: z.ZodType<PostBody> = z.object({
  /** 본문 블록 */
  blocks: z.array(postBlockSchema),
  /** 커버. 없으면 null */
  cover: postImageSchema.nullable(),
});

/** 목차를 보이는 제목 개수의 최소값([[Chrome:글 화면]]) */
export const TOC_MIN_HEADINGS = 1;

/** 목차 항목 하나. id는 제목 요소의 id이며 목차에서 그 제목으로 스크롤할 때 쓴다. */
export type TocHeading = {
  id: string;
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
 * 제목 블록 요소의 id. 본문 안 자리로 만든다. 맨 위 블록은 차례 하나(`heading-3`), 열 안의 블록은 열 나누기 블록 차례·열 차례·열 안 차례를
 * 잇는다(`heading-3-1-0`).
 * @param path 본문 안 자리(맨 위 차례부터)
 * @returns id
 */
export function getHeadingId(...path: number[]): string {
  return `heading-${path.map(String).join('-')}`;
}

/** 목차와 제목 단계를 정하는 제목 하나. path는 본문 안 자리(`getHeadingId`)다 */
export type OutlineHeading = {
  block: HeadingBlock;
  path: number[];
};

// 제목 블록의 단계다.
const headingLevels = { heading_1: 1, heading_2: 2, heading_3: 3 } as const satisfies Record<
  HeadingBlock['type'],
  number
>;

/**
 * 제목 블록의 단계(제목 1·2·3).
 * @param block 제목 블록
 * @returns 단계
 */
export function getHeadingLevel(block: HeadingBlock): number {
  return headingLevels[block.type];
}

/**
 * 목차에 들고 가장 높은 제목 단계를 찾는 범위의 제목을 본문 차례대로 모은다. 맨 위 블록과 열 안의 블록(열 안의 열 포함)을 보고,
 * 토글과 목록 안의 제목은 넣지 않는다. 열은 늘 보이지만 토글은 접혀 있기 때문이다.
 * @codocs [[Notion 블록:모양]]
 * @codocs [[Notion 블록:지원 블록]]
 * @param blocks 본문 블록
 * @param parentPath 블록들이 놓인 자리. 맨 위면 비어 있다
 * @returns 제목과 자리
 */
export function getOutlineHeadings(
  blocks: readonly PostBlock[],
  parentPath: readonly number[] = [],
): OutlineHeading[] {
  return blocks.flatMap(
    /**
     * 블록 하나가 제목이면 그 제목을, 열 나누기면 열 안의 제목을 돌려준다.
     * @param block 블록
     * @param index 블록 차례
     * @returns 제목과 자리
     */
    (block, index): OutlineHeading[] => {
      const path = [...parentPath, index];
      if (isHeadingBlock(block)) {
        return [{ block, path }];
      }
      if (block.type !== 'column_list') {
        return [];
      }
      return block.children.flatMap((column, columnIndex) =>
        column.type === 'column' ? getOutlineHeadings(column.children, [...path, columnIndex]) : [],
      );
    },
  );
}

/**
 * 글에서 가장 높은 제목 단계를 찾는다(`getOutlineHeadings`의 범위). 글 제목이 h1이고 이 단계를 h2로 그린다.
 * @codocs [[Notion 블록:모양]]
 * @param blocks 본문 블록
 * @returns 가장 높은 제목 단계(제목이 없으면 1)
 */
export function getTopHeadingLevel(blocks: readonly PostBlock[]): number {
  const levels = getOutlineHeadings(blocks).map((heading) => getHeadingLevel(heading.block));
  return levels.length > 0 ? Math.min(...levels) : 1;
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
 * 본문의 목차 항목. 제목(Heading)이 1개 이상일 때 목차를 보이므로, 제목이 없으면 빈 목록이다. 열 안의 제목도 넣는다.
 * @codocs [[Chrome:글 화면]]
 * @codocs [[Notion 블록:지원 블록]]
 * @param blocks 본문 블록
 * @returns 목차 항목
 */
export function getTocHeadings(blocks: readonly PostBlock[]): TocHeading[] {
  const headings = getOutlineHeadings(blocks).map(({ block, path }) => ({
    id: getHeadingId(...path),
    label: getPlainText(block.richText),
  }));
  return headings.length >= TOC_MIN_HEADINGS ? headings : [];
}

/**
 * 넓은 창에서 열마다 남는 너비를 나눠 가질 몫(`flex-grow`)을 정한다. Notion `width_ratio`의 비율을 따르고, 비율이 없는 열은
 * 다른 열들의 평균 몫(모두 없으면 똑같이)을 갖는다. 몫의 합이 열 수가 되도록 맞춰, 합이 1보다 작아 너비가 남지 않게 한다.
 * @codocs [[Notion 블록:지원 블록]]
 * @param ratios 열마다의 `width_ratio`(없으면 null)
 * @returns 열마다의 몫
 */
export function getColumnGrows(ratios: readonly (number | null)[]): number[] {
  const known = ratios.filter((ratio): ratio is number => ratio !== null && ratio > 0);
  const fallback =
    known.length === 0 ? 1 : known.reduce((sum, ratio) => sum + ratio, 0) / known.length;
  const filled = ratios.map((ratio) => (ratio !== null && ratio > 0 ? ratio : fallback));
  const total = filled.reduce((sum, ratio) => sum + ratio, 0);
  return filled.map((ratio) => (ratio / total) * filled.length);
}
