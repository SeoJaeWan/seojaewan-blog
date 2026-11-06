import 'server-only';

import { z } from 'zod';

import { getNotionRequestKey, type NotionClient } from '@/content/notion-client/notion-client';

// 요청 이름(`getNotionRequestKey`)마다 저장한 Notion API 응답
const responsesSchema = z.record(z.string(), z.unknown());

/**
 * 저장해 둔 Notion API 응답을 돌려주는 가짜 Notion 클라이언트를 만든다. 운영과 같은 읽기·변환 코드를 지나게 하기 위해
 * 응답을 변환하지 않고 그대로 돌려준다. 저장하지 않은 요청은 오류다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @codocs [[테스트 작성 규칙:테스트 데이터와 외부 호출]]
 * @param responses 요청 이름마다의 응답
 * @returns 가짜 Notion 클라이언트
 */
export function createNotionFixtureClient(
  responses: Readonly<Record<string, unknown>>,
): NotionClient {
  return {
    request(request) {
      const key = getNotionRequestKey(request);
      if (!Object.hasOwn(responses, key)) {
        return Promise.reject(
          new Error(
            `[notion-fixture] 저장하지 않은 요청이다: ${key}. \`pnpm --filter @seojaewan/web fetch:notion-fixture\`로 다시 받는다`,
          ),
        );
      }
      return Promise.resolve(responses[key]);
    },
  };
}

/**
 * 저장소에 저장한 Notion API 응답(`notion-responses.json`)으로 가짜 Notion 클라이언트를 만든다.
 * fixture 모드에서만 불러, 운영 빌드가 시험 데이터를 읽지 않게 한다.
 * @codocs [[콘텐츠 원천:읽는 곳]]
 * @returns 가짜 Notion 클라이언트
 */
export async function loadNotionFixtureClient(): Promise<NotionClient> {
  const { default: responses } = await import('./notion-responses.json');
  return createNotionFixtureClient(responsesSchema.parse(responses));
}
