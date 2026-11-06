import { z } from 'zod';

import type { PostCollection } from '@/shared/utils/post-address/post-address';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 공개 행 하나(Notion 데이터베이스 한 줄의 속성)의 스키마. 제목, `slug`, `폴더`, 작성일, 커버, Summary와 페이지 ID다.
 * 필수 값 검사는 공개 행에만 한다(`readPostRows`가 공개 행만 넘긴다). 세 묶음(`blog`, `project`, `about`)이 같은 속성을 쓴다.
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @codocs [[콘텐츠 원천:공개 여부]]
 * @codocs [[코드 작성 규칙:타입]]
 */
export const postRowSchema = z.object({
  /** Notion 페이지 ID. 본문 블록을 읽을 때 쓴다 */
  pageId: z.string().min(1),
  /** 제목 */
  title: z.string().trim().min(1),
  /** 주소의 마지막 마디. 영어 소문자·숫자·하이픈 */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  /** 처음 놓일 폴더. 하위 폴더는 `React/Hooks`처럼 경로로 쓴다. 비어 있으면 그 묶음의 폴더다 */
  folder: z.string(),
  /** 작성일(YYYY-MM-DD) */
  publishedAt: z.iso.date(),
  /** 커버 이미지의 이미지 서버 주소. 없으면 null */
  cover: z.url().nullable(),
  /** 페이지 설명. 없으면 빈 문자열 */
  summary: z.string(),
});

/** 공개 행 하나 */
export type PostRow = z.infer<typeof postRowSchema>;

const postRowsSchema = z
  .array(postRowSchema)
  .refine(
    (rows) => new Set(rows.map((row) => row.slug)).size === rows.length,
    '같은 데이터베이스 안에 slug가 겹치는 행이 있다',
  );

/**
 * 공개 행들을 검증하고 최신순(작성일이 늦은 것부터)으로 늘어놓는다. slug는 같은 데이터베이스 안에서만 유일하면 된다.
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @param rows 한 데이터베이스의 공개 행들(검증 전)
 * @returns 검증한 공개 행들
 */
export function parsePostRows(rows: unknown): PostRow[] {
  const result = postRowsSchema.safeParse(rows);
  if (!result.success) {
    throw new Error(`[content] 공개 행의 값이 맞지 않다.\n${z.prettifyError(result.error)}`);
  }
  return result.data.toSorted((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/**
 * 공개 행 하나를 글 색인 한 줄(작업 공간이 쓰는 글 목록)로 바꾼다.
 * `폴더` 속성은 `/`로 나누고 칸마다 앞뒤 공백과 빈 칸을 지운다. 본문과 커버는 색인에 넣지 않는다.
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @codocs [[작업 공간 맞추기:초기 구조]]
 * @param row 검증한 공개 행
 * @param collection 행이 속한 묶음
 * @returns 글 색인 한 줄
 */
export function toPostSummary(row: PostRow, collection: PostCollection): PostSummary {
  return {
    collection,
    slug: row.slug,
    title: row.title,
    folderPath: row.folder
      .split('/')
      .map((segment) => segment.trim())
      .filter((segment) => segment !== ''),
    date: row.publishedAt,
  };
}
