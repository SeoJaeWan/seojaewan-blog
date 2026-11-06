import { respondContentBody } from '@/app/_content-entry/content-body-response';
import {
  type ContentEntryParams,
  getContentEntryParams,
} from '@/app/_content-entry/content-entry-page';

type ProjectBodyRouteContext = {
  params: Promise<ContentEntryParams>;
};

// @codocs [[콘텐츠 원천:결정]]
// 빌드할 때 공개 항목마다 본문 JSON을 만들어 두는 정적 경로다. 모르는 slug는 404다.
export const dynamic = 'force-static';
export const dynamicParams = false;

/**
 * 빌드할 때 공개 Project 항목마다 본문 JSON을 만들어 둔다.
 * @codocs [[콘텐츠 원천:결정]]
 * @returns 공개 Project 항목의 slug
 */
export async function generateStaticParams(): Promise<ContentEntryParams[]> {
  return getContentEntryParams('project');
}

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
