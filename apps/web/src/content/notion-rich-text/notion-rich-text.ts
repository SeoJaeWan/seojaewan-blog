import { z } from 'zod';

import type { RichText, RichTextAnnotations } from '@/shared/utils/post-body/post-body';

/** 블로그 주소의 호스트. 이 호스트로 가는 링크는 사이트 안 링크(경로)로 바꾼다 */
const BLOG_HOSTS = ['seojaewan.com', 'www.seojaewan.com'] as const;

// 블로그가 따르는 글자 서식. Notion 색(`color`)은 따르지 않는다.
const ANNOTATION_NAMES = ['bold', 'italic', 'underline', 'strikethrough', 'code'] as const;

/**
 * Notion 글자 조각(rich text) 하나의 스키마. 블로그가 읽는 부분만 검증한다.
 * @codocs [[코드 작성 규칙:타입]]
 */
export const notionRichTextSchema = z.object({
  plain_text: z.string(),
  href: z.string().nullable(),
  annotations: z.object({
    bold: z.boolean(),
    italic: z.boolean(),
    strikethrough: z.boolean(),
    underline: z.boolean(),
    code: z.boolean(),
    color: z.string(),
  }),
});

/** Notion 글자 조각 하나 */
export type NotionRichText = z.infer<typeof notionRichTextSchema>;

/**
 * Notion 글자 조각들을 본문 글자 조각으로 바꾼다.
 * 서식은 굵게·기울임·밑줄·취소선·인라인 코드만 옮기고 여럿이면 모두 옮긴다. Notion 색(글자색, 형광펜)은 버린다.
 * 블로그 주소(`https://seojaewan.com/posts/x`)로 가는 링크는 사이트 안 링크(`/posts/x`)로 바꾼다.
 * 인라인 수식과 멘션은 Notion이 보여 주는 글자 그대로 둔다.
 * @codocs [[Notion 블록:모양]]
 * @param richText Notion 글자 조각들
 * @returns 본문 글자 조각들
 */
export function toRichText(richText: readonly NotionRichText[]): RichText[] {
  return richText.map(toRichTextPart);
}

/**
 * Notion 글자 조각들의 글자만 잇는다.
 * @param richText Notion 글자 조각들
 * @returns 글자
 */
export function toPlainText(richText: readonly NotionRichText[]): string {
  return richText.map((part) => part.plain_text).join('');
}

/**
 * Notion 글자 조각 하나를 본문 글자 조각으로 바꾼다.
 * @param part Notion 글자 조각
 * @returns 본문 글자 조각
 */
function toRichTextPart(part: NotionRichText): RichText {
  const annotations = toAnnotations(part.annotations);
  return {
    text: part.plain_text,
    link: part.href === null || part.href === '' ? null : toSiteLink(part.href),
    ...(annotations === undefined ? {} : { annotations }),
  };
}

/**
 * Notion 서식에서 블로그가 따르는 서식 가운데 켜진 것만 고른다.
 * @param annotations Notion 서식
 * @returns 켜진 서식. 하나도 없으면 undefined
 */
function toAnnotations(
  annotations: NotionRichText['annotations'],
): RichTextAnnotations | undefined {
  const enabled = ANNOTATION_NAMES.filter((name) => annotations[name]);
  return enabled.length === 0 ? undefined : Object.fromEntries(enabled.map((name) => [name, true]));
}

/**
 * 블로그 주소로 가는 링크를 사이트 안 경로로 바꾼다. 다른 링크는 그대로 둔다.
 * @param href 링크 주소
 * @returns 사이트 안 경로나 원래 주소
 */
function toSiteLink(href: string): string {
  if (!URL.canParse(href)) {
    return href;
  }
  const url = new URL(href);
  const isBlogUrl =
    (url.protocol === 'https:' || url.protocol === 'http:') &&
    BLOG_HOSTS.some((host) => host === url.hostname);
  return isBlogUrl ? `${url.pathname}${url.search}${url.hash}` : href;
}
