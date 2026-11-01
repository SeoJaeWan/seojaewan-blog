import { spyOn } from 'storybook/test';

import type { PostBlock } from '@/shared/utils/post-body/post-body';

import { clearPostBodyCache } from './hooks/use-post-body/use-post-body';

/** 글 본문 서버 경로 앞부분 */
const POST_BODY_PATH = '/api/posts/';

// 가짜로 받은 본문 요청 주소. `mockPostBodies`를 부를 때마다 비운다.
const postBodyRequests: string[] = [];

/**
 * 가짜로 받은 글 본문 요청 주소를 돌려준다.
 * @returns 요청 주소
 */
export function getPostBodyRequests(): readonly string[] {
  return postBodyRequests;
}

/**
 * 스토리가 글 본문 서버 경로(`/api/posts/<slug>`)를 가짜 본문으로 대신하게 한다. 다른 요청은 그대로 보낸다.
 * 받아 둔 본문 기억도 비운다. 스토리 `beforeEach`에서 부르고, 돌려준 함수를 정리 함수로 돌려준다.
 * @param bodies slug마다의 본문. null이면 404, 적지 않은 slug는 빈 본문이다
 * @returns 진짜 `fetch`로 돌려놓는 함수
 */
export function mockPostBodies(
  bodies: Readonly<Record<string, readonly PostBlock[] | null>>,
): () => void {
  clearPostBodyCache();
  postBodyRequests.length = 0;
  const realFetch = window.fetch.bind(window);
  const spy = spyOn(window, 'fetch').mockImplementation(
    /**
     * 본문 경로면 가짜 본문을, 아니면 진짜 응답을 돌려준다.
     * @param input 요청 주소
     * @param init 요청 설정
     * @returns 응답
     */
    (input, init) => {
      const url = input instanceof Request ? input.url : String(input);
      const path = url.startsWith('http') ? new URL(url).pathname : url;
      if (!path.startsWith(POST_BODY_PATH)) {
        return realFetch(input, init);
      }
      postBodyRequests.push(path);
      const slug = decodeURIComponent(path.slice(POST_BODY_PATH.length));
      const found = bodies[slug];
      const body = found === undefined ? [] : found;
      return Promise.resolve(
        body === null
          ? Response.json({ error: 'not-found' }, { status: 404 })
          : Response.json({ blocks: body }),
      );
    },
  );
  return () => {
    spy.mockRestore();
    clearPostBodyCache();
  };
}
