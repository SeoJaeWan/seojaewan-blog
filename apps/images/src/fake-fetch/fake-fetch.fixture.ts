/** 가짜 fetch가 받은 요청 하나 */
export type FakeRequest = {
  url: string;
  method: string;
  headers: Headers;
  body: string | null;
};

/** 주소마다 응답을 정하는 함수. 정하지 않은 주소는 undefined를 돌려 404가 된다 */
export type FakeRoute = (request: FakeRequest) => Response | Promise<Response> | undefined;

/**
 * 주소마다 정한 응답을 돌려주는 가짜 fetch를 만든다. 받은 요청을 모두 남긴다.
 * @param route 응답을 정하는 함수
 * @returns 가짜 fetch와 받은 요청
 */
export function createFakeFetch(route: FakeRoute): {
  fetch: typeof globalThis.fetch;
  requests: FakeRequest[];
} {
  const requests: FakeRequest[] = [];
  /**
   * 요청을 남기고 정한 응답을 돌려준다.
   * @param input 주소
   * @param init 요청 설정
   * @returns 응답
   */
  async function fetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
    const request: FakeRequest = {
      url: input instanceof Request ? input.url : String(input),
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? init.body : null,
    };
    requests.push(request);
    return (await route(request)) ?? new Response('not found', { status: 404 });
  }
  return { fetch, requests };
}

/**
 * JSON 응답을 만든다.
 * @param body 본문
 * @param status 상태 코드
 * @returns 응답
 */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
