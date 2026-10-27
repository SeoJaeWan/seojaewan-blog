import { z } from 'zod';

import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * Notion 글 데이터베이스 한 줄(속성)의 스키마. 제목, `slug`, `폴더`, 작성일, 커버 속성과 같은 모양이다.
 * 지금은 임시 글 원천(`temporary-posts`)을 검증하고, Notion을 붙이면 Notion 응답에서 같은 모양을 만들어 검증한다.
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @codocs [[코드 작성 규칙:타입]]
 */
export const postRowSchema = z.object({
  /** 제목 */
  title: z.string().trim().min(1),
  /** 글 주소 `/posts/<slug>`. 영어 소문자·숫자·하이픈 */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  /** 처음 놓일 폴더. 하위 폴더는 `React/Hooks`처럼 경로로 쓴다. 비어 있으면 `Blog` 폴더다 */
  folder: z.string(),
  /** 작성일(YYYY-MM-DD) */
  publishedAt: z.iso.date(),
  /** 커버 이미지 주소. 없으면 null */
  cover: z.url().nullable(),
});

/** Notion 글 데이터베이스 한 줄 */
export type PostRow = z.infer<typeof postRowSchema>;

const postRowsSchema = z
  .array(postRowSchema)
  .refine(
    (rows) => new Set(rows.map((row) => row.slug)).size === rows.length,
    'slug가 겹치는 글이 있다',
  );

/**
 * 글 데이터베이스의 줄들을 검증해 글 색인(작업 공간이 쓰는 글 목록)으로 바꾼다.
 * `폴더` 속성은 `/`로 나누고 칸마다 앞뒤 공백과 빈 칸을 지운다. 본문과 커버는 색인에 넣지 않는다.
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @codocs [[작업 공간:초기 구조]]
 * @param rows 글 데이터베이스의 줄들(검증 전)
 * @returns 글 색인
 */
export function parsePostIndex(rows: unknown): PostSummary[] {
  return postRowsSchema.parse(rows).map(toPostSummary);
}

/**
 * 글 줄 하나를 글 색인 한 줄로 바꾼다.
 * @param row 검증한 글 줄
 * @returns 글 색인 한 줄
 */
function toPostSummary(row: PostRow): PostSummary {
  return {
    slug: row.slug,
    title: row.title,
    folderPath: row.folder
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment !== ''),
    date: row.publishedAt,
  };
}
