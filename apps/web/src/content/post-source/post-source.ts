import 'server-only';

import { parsePostIndex } from '@/content/post-schema/post-schema';
import { temporaryPostRows } from '@/content/temporary-posts/temporary-posts';
import type { PostSummary } from '@/shared/utils/workspace-rules/workspace-rules';

/**
 * 글 색인(모든 글의 제목, slug, 폴더 경로, 작성일)을 서버에서 읽는다. `app/page.tsx`가 읽어 shell에 넘긴다.
 * 지금은 임시 글 원천을 읽고, Notion을 붙이면 이 함수 안에서 Notion 글 데이터베이스를 읽어 같은 검증(`parsePostIndex`)을 거친다.
 * 서버에서만 읽어 Notion 토큰이 브라우저로 나가지 않게 한다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[콘텐츠 원천:Notion 속성]]
 * @returns 글 색인
 */
export async function getPostIndex(): Promise<PostSummary[]> {
  return Promise.resolve(parsePostIndex(temporaryPostRows));
}
