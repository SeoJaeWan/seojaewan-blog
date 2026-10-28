// 글 본문 블록의 모양이다. Notion 블록을 단순화했다. 서버(`content/`)가 원천을 검증해 내보내고, 브라우저(Chrome 글 화면)가
// 서버 경로에서 받은 본문을 다시 검증해 그린다. 두 쪽이 같은 스키마를 써서 shared에 둔다.

import { z } from 'zod';

/** 글자 조각 하나. 링크가 있으면 그 주소다(블로그 글 주소나 외부 주소) */
export const richTextSchema = z.object({
  /** 글자 */
  text: z.string(),
  /** 링크 주소. 없으면 null */
  link: z.string().min(1).nullable(),
});

/** 글자 조각 하나 */
export type RichText = z.infer<typeof richTextSchema>;

/**
 * 본문 블록 하나. 피그마 디자인이 있는 블록만 받는다(제목 1~3, 문단, 코드 블록). 이름은 Notion 블록 종류와 같다.
 * 지원하지 않는 블록은 문서대로라면 안내 상자로 보여야 하지만, 9단계 전까지는 임시로 스키마가 받지 않는다.
 * @codocs [[Chrome:Notion 블록]]
 */
export const postBlockSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('heading_1'), richText: z.array(richTextSchema).min(1) }),
  z.object({ type: z.literal('heading_2'), richText: z.array(richTextSchema).min(1) }),
  z.object({ type: z.literal('heading_3'), richText: z.array(richTextSchema).min(1) }),
  z.object({ type: z.literal('paragraph'), richText: z.array(richTextSchema) }),
  z.object({ type: z.literal('code'), language: z.string().min(1), code: z.string() }),
]);

/** 본문 블록 하나 */
export type PostBlock = z.infer<typeof postBlockSchema>;

/** 제목 블록 */
export type HeadingBlock = Extract<PostBlock, { type: 'heading_1' | 'heading_2' | 'heading_3' }>;

/** 글 본문. 블록을 차례대로 담는다 */
export const postBodySchema = z.object({
  /** 본문 블록 */
  blocks: z.array(postBlockSchema),
});

/** 글 본문 */
export type PostBody = z.infer<typeof postBodySchema>;

/** 목차를 보이는 제목 개수의 최소값([[Chrome:글 화면]]) */
export const TOC_MIN_HEADINGS = 3;

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
 * 본문의 목차 항목. 제목(Heading)이 3개 이상일 때만 목차를 보이므로, 그보다 적으면 빈 목록이다.
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
