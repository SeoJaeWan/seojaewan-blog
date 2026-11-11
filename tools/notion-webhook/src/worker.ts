// @codocs [[콘텐츠 원천:갱신 방식]]
// Cloudflare Worker. Notion 웹훅을 받아 서명을 확인하고 GitHub repository_dispatch를 한 번 부른다.
// Notion 웹훅은 GitHub API가 요구하는 인증 헤더와 본문(event_type)을 만들 수 없어 이 중계가 필요하다.
import { buildDispatchRequest, shouldDispatch } from './dispatch.ts';
import { verifyNotionSignature } from './signature.ts';

// Cloudflare가 정한 이름이라 SCREAMING_CASE 그대로다. 앞의 둘은 wrangler.toml의 vars, 뒤의 둘은 Worker 비밀 값이다
// (repository_dispatch 권한이 있는 Fine-grained PAT, Notion 구독의 verification_token).
export type Env = Readonly<Record<'GITHUB_REPO' | 'DISPATCH_EVENT_TYPE', string>> &
  Readonly<
    Partial<Record<'GITHUB_DISPATCH_TOKEN' | 'NOTION_VERIFICATION_TOKEN', string | undefined>>
  >;

type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

/**
 * 값이 객체인지 본다.
 * @param value 확인할 값
 * @returns 객체이면 true
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 한 줄짜리 텍스트 응답을 만든다.
 * @param status HTTP 상태 코드
 * @param body 응답 본문
 * @returns 응답
 */
function text(status: number, body: string): Response {
  return new Response(body, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

/**
 * Notion 웹훅 요청 하나를 처리한다. 확인 요청이면 토큰을 로그에 남기고, 서명이 맞는 페이지 이벤트면 GitHub dispatch를 부른다.
 * @param request Notion이 보낸 요청
 * @param env Worker 변수와 비밀 값
 * @param fetchImpl GitHub를 부르는 함수. 시험에서 바꿔 끼운다
 * @returns Notion에 돌려줄 응답. 재시도가 필요하면 5xx다
 */
export async function handleRequest(
  request: Request,
  env: Env,
  fetchImpl: FetchLike = fetch,
): Promise<Response> {
  if (request.method !== 'POST') {
    return text(405, 'POST만 받는다');
  }

  // 서명은 받은 본문 그대로의 바이트로 계산하므로 먼저 문자열로 읽어 둔다
  const rawBody = await request.text();
  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return text(400, 'JSON이 아니다');
  }
  if (!isRecord(payload)) {
    return text(400, 'JSON 객체가 아니다');
  }

  // 구독을 만들 때 Notion이 한 번 보내는 확인 요청이다. 사람이 `wrangler tail`로 토큰을 보고 Notion 화면에 붙여 넣는다.
  // 이 요청으로는 아무것도 시작하지 않는다.
  if (typeof payload.verification_token === 'string') {
    console.log(`Notion verification_token: ${payload.verification_token}`);
    return text(200, '확인 토큰을 로그에 남겼다');
  }

  const verificationToken = env.NOTION_VERIFICATION_TOKEN;
  const githubToken = env.GITHUB_DISPATCH_TOKEN;
  if (!verificationToken || !githubToken) {
    // 비밀 값이 아직 없다. 200으로 받으면 Notion이 다시 보내지 않으므로 실패로 돌려 재시도를 받는다
    console.error('Worker 비밀 값(NOTION_VERIFICATION_TOKEN, GITHUB_DISPATCH_TOKEN)이 없다');
    return text(500, '설정이 끝나지 않았다');
  }

  const signature = request.headers.get('X-Notion-Signature');
  if (!(await verifyNotionSignature(rawBody, signature, verificationToken))) {
    return text(401, '서명이 맞지 않는다');
  }

  if (!shouldDispatch(payload.type)) {
    return text(200, '상관없는 이벤트라 넘긴다');
  }

  const { url, init } = buildDispatchRequest(
    { repo: env.GITHUB_REPO, token: githubToken, eventType: env.DISPATCH_EVENT_TYPE },
    { type: String(payload.type), ...(typeof payload.id === 'string' ? { id: payload.id } : {}) },
  );
  let response: Response;
  try {
    response = await fetchImpl(url, init);
  } catch (error) {
    console.error('GitHub 요청이 실패했다', error);
    return text(502, 'GitHub에 닿지 않았다');
  }
  if (response.status !== 204) {
    // 실패하면 Notion이 다시 보내도록 502로 돌려 준다
    console.error(`GitHub가 ${response.status}로 답했다: ${(await response.text()).slice(0, 300)}`);
    return text(502, 'GitHub가 받지 않았다');
  }
  return text(200, '글 동기화를 시작했다');
}

export default {
  fetch: (request: Request, env: Env): Promise<Response> => handleRequest(request, env),
};
