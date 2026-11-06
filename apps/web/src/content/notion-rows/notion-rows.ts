import { z } from 'zod';

import { getNotionCoverAddress } from '@/content/notion-image-address/notion-image-address';
import { notionRichTextSchema, toPlainText } from '@/content/notion-rich-text/notion-rich-text';
import { parsePostRows, type PostRow } from '@/content/post-schema/post-schema';

/** 블로그가 읽는 Notion 속성 이름. 세 데이터베이스가 같다. Tags와 Created는 읽지 않는다 */
const PROPERTY_NAMES = {
  title: '제목',
  slug: 'slug',
  folder: '폴더',
  isPublic: '공개',
  publishedAt: '작성일',
  summary: 'Summary',
} as const;

// 행(페이지)에서 블로그가 읽는 부분. 속성은 비어 있거나 없을 수 있어(쓰는 중인 글) 하나씩 너그럽게 읽는다.
const pageSchema = z.object({
  object: z.literal('page'),
  id: z.string(),
  cover: z
    .discriminatedUnion('type', [
      z.object({ type: z.literal('external'), external: z.object({ url: z.string() }) }),
      z.object({ type: z.literal('file'), file: z.object({ url: z.string() }) }),
    ])
    .nullable(),
  properties: z.record(z.string(), z.unknown()),
});

/** 행(Notion 페이지)에서 블로그가 읽는 부분 */
type NotionPage = z.infer<typeof pageSchema>;

const titlePropertySchema = z.object({
  type: z.literal('title'),
  title: z.array(notionRichTextSchema),
});
const textPropertySchema = z.object({
  type: z.literal('rich_text'),
  rich_text: z.array(notionRichTextSchema),
});
const checkboxPropertySchema = z.object({ type: z.literal('checkbox'), checkbox: z.boolean() });
const datePropertySchema = z.object({
  type: z.literal('date'),
  date: z.object({ start: z.string() }).nullable(),
});

/**
 * 데이터베이스 행(Notion 페이지)들에서 공개 행만 골라 검증한다.
 * - `공개`가 체크된 행만 남긴다. 체크하지 않은 행은 사이트에 없는 것과 같다.
 * - 필수 값(제목, slug, 작성일) 검사는 공개 행에만 한다. 쓰는 중인 글에 slug가 없어도 깨지지 않는다.
 * - 작성일에 시각이 있으면 날짜만 쓴다. 커버는 이미지 서버 주소로 바꾼다.
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @param pages 한 데이터베이스의 행(Notion 페이지 응답 그대로)
 * @returns 검증한 공개 행들(최신순)
 */
export function readPostRows(pages: readonly unknown[]): PostRow[] {
  const rows = pages
    .map((page) => pageSchema.parse(page))
    .filter((page) => readCheckbox(page.properties[PROPERTY_NAMES.isPublic]))
    .map(toRowValues);
  return parsePostRows(rows);
}

/**
 * 행(페이지)의 속성 값을 읽는다. 검증은 하지 않는다.
 * @param page 행
 * @returns 행의 값(검증 전)
 */
function toRowValues(page: NotionPage): Record<keyof PostRow, unknown> {
  return {
    pageId: page.id,
    title: readTitle(page.properties[PROPERTY_NAMES.title]),
    slug: readText(page.properties[PROPERTY_NAMES.slug]).trim(),
    folder: readText(page.properties[PROPERTY_NAMES.folder]),
    publishedAt: readDate(page.properties[PROPERTY_NAMES.publishedAt]),
    cover: toCoverAddress(page.id, page.cover),
    summary: readText(page.properties[PROPERTY_NAMES.summary]),
  };
}

/**
 * 제목 속성의 글자. 없으면 빈 문자열이다.
 * @param property 속성
 * @returns 제목
 */
function readTitle(property: unknown): string {
  const result = titlePropertySchema.safeParse(property);
  return result.success ? toPlainText(result.data.title) : '';
}

/**
 * 글자 속성의 글자. 없으면 빈 문자열이다.
 * @param property 속성
 * @returns 글자
 */
function readText(property: unknown): string {
  const result = textPropertySchema.safeParse(property);
  return result.success ? toPlainText(result.data.rich_text) : '';
}

/**
 * 체크박스 속성이 체크됐는지. 없으면 체크하지 않은 것이다.
 * @param property 속성
 * @returns 체크했으면 true
 */
function readCheckbox(property: unknown): boolean {
  const result = checkboxPropertySchema.safeParse(property);
  return result.success && result.data.checkbox;
}

/**
 * 날짜 속성의 날짜(YYYY-MM-DD). 시각이 있으면 날짜 부분만 쓴다. 없으면 빈 문자열이다.
 * @param property 속성
 * @returns 날짜
 */
function readDate(property: unknown): string {
  const result = datePropertySchema.safeParse(property);
  return result.success ? (result.data.date?.start.slice(0, 'YYYY-MM-DD'.length) ?? '') : '';
}

/**
 * 페이지 커버를 이미지 서버 주소로 바꾼다.
 * @param pageId 페이지 ID
 * @param cover 페이지 커버
 * @returns 이미지 서버 주소. 커버가 없으면 null
 */
function toCoverAddress(pageId: string, cover: NotionPage['cover']): string | null {
  if (cover === null) {
    return null;
  }
  return getNotionCoverAddress(pageId, {
    type: cover.type,
    url: cover.type === 'file' ? cover.file.url : cover.external.url,
  });
}
