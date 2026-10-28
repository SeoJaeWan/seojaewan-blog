import { getPostBody } from '@/content/post-source/post-source';

type PostBodyRouteContext = {
  /** 경로의 글 slug */
  params: Promise<PostRouteParams>;
};

/** 경로 값 */
type PostRouteParams = {
  /** 글 slug */
  slug: string;
};

/**
 * 글 본문을 돌려준다. Chrome 글 탭이 이 경로로 본문을 받는다. 본문은 서버(`content/`)에서만 읽는다.
 * 색인에 없는 글이면 404다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @param _request 요청
 * @param context 경로 값
 * @returns 본문 JSON
 */
export async function GET(_request: Request, context: PostBodyRouteContext): Promise<Response> {
  const { slug } = await context.params;
  const body = await getPostBody(slug);
  if (body === null) {
    return Response.json({ error: 'not-found' }, { status: 404 });
  }
  return Response.json(body);
}
