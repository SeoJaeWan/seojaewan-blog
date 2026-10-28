import 'server-only';

import { parsePostIndex } from '@/content/post-schema/post-schema';
import { temporaryPostBodies } from '@/content/temporary-post-bodies/temporary-post-bodies';
import { temporaryPostRows } from '@/content/temporary-posts/temporary-posts';
import { type PostBody, postBodySchema } from '@/shared/utils/post-body/post-body';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 글 색인(모든 글의 제목, slug, 폴더 경로, 작성일)을 서버에서 읽는다. `app/`의 페이지가 읽어 shell에 넘긴다.
 * 지금은 임시 글 원천을 읽고, Notion을 붙이면 이 함수 안에서 Notion 글 데이터베이스를 읽어 같은 검증(`parsePostIndex`)을 거친다.
 * 서버에서만 읽어 Notion 토큰이 브라우저로 나가지 않게 한다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @returns 글 색인
 */
export async function getPostIndex(): Promise<PostSummary[]> {
  return Promise.resolve(parsePostIndex(temporaryPostRows));
}

/**
 * 글 하나의 본문을 서버에서 읽는다. 브라우저는 서버 경로(`app/api/posts/[slug]`)로 받는다.
 * 지금은 임시 글 본문을 읽고, Notion을 붙이면 이 함수 안에서 Notion 블록을 읽어 같은 모양(`postBodySchema`)으로 바꾼다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[콘텐츠 원천:결정]]
 * @codocs [[Chrome:Notion 블록]]
 * @param slug 글 slug
 * @returns 본문. 색인에 없는 글이면 null
 */
export async function getPostBody(slug: string): Promise<PostBody | null> {
  const index = await getPostIndex();
  if (!index.some((post) => post.slug === slug)) {
    return null;
  }
  return postBodySchema.parse({ blocks: temporaryPostBodies[slug] ?? [] });
}
