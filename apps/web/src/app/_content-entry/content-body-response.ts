import { getContentBody } from '@/content/content-store/content-store';
import type { PostCollection } from '@/shared/utils/post-address/post-address';

import type { ContentEntryParams } from './content-entry-page';

/**
 * 항목 본문을 JSON으로 돌려준다. Chrome 글 탭이 `/api` 뒤에 글 경로를 붙인 경로(`/api/posts/<slug>` 등)로 본문을 받는다.
 * 본문은 서버(`content/`)에서만 읽는다. 빌드할 때 공개 항목마다 만들어 두는 정적 응답이다. 공개 항목이 아니면 404다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @codocs [[콘텐츠 원천:결정]]
 * @param collection 묶음
 * @param params 경로 값
 * @returns 본문 JSON
 */
export async function respondContentBody(
  collection: PostCollection,
  params: Promise<ContentEntryParams>,
): Promise<Response> {
  const { slug } = await params;
  const body = await getContentBody({ collection, slug });
  if (body === null) {
    return Response.json({ error: 'not-found' }, { status: 404 });
  }
  return Response.json(body);
}
