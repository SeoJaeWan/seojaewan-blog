import { respondContentBody } from '@/app/_content-entry/content-body-response';
import type { ContentEntryParams } from '@/app/_content-entry/content-entry-page';

type ProjectBodyRouteContext = {
  params: Promise<ContentEntryParams>;
};

/**
 * Project 항목 본문을 돌려준다. Chrome 글 탭이 이 경로로 본문을 받는다. 공개 항목이 아니면 404다.
 * @codocs [[코드 작성 규칙:React와 Next.js]]
 * @param _request 요청
 * @param context 경로 값
 * @returns 본문 JSON
 */
export async function GET(_request: Request, context: ProjectBodyRouteContext): Promise<Response> {
  return respondContentBody('project', context.params);
}
