// @codocs [[콘텐츠 원천:갱신 방식]]
// 어떤 Notion 이벤트에 글 동기화를 시작할지 정하고, GitHub repository_dispatch 요청을 만든다.
// https://docs.github.com/en/rest/repos/repos#create-a-repository-dispatch-event

// 페이지가 바뀌었을 때만 시작한다. 글 속성·본문이 바뀌거나 페이지가 생기고 지워지고 옮겨질 때다.
// 댓글·데이터베이스 구조 이벤트 같은 상관없는 이벤트는 받기만 한다.
// 문서에는 데이터베이스 행의 `data.parent` 모양이 없어 어느 데이터베이스인지는 가리지 않는다. 글이 아닌 페이지의
// 이벤트로 시작해도 내보내기 결과가 같으면 동기화는 "바뀐 것 없음"으로 끝난다.
// https://developers.notion.com/reference/webhooks-events-delivery
const dispatchNotionEvents: ReadonlySet<string> = new Set([
  'page.created',
  'page.content_updated',
  'page.properties_updated',
  'page.deleted',
  'page.undeleted',
  'page.moved',
]);

/**
 * Notion 이벤트 이름이 글 동기화를 시작할 이벤트인지 본다.
 * @param notionEventType 이벤트 본문의 `type` 값
 * @returns 시작해야 하면 true
 */
export function shouldDispatch(notionEventType: unknown): boolean {
  return typeof notionEventType === 'string' && dispatchNotionEvents.has(notionEventType);
}

// repo는 `소유자/저장소`, token은 repository_dispatch 권한이 있는 토큰, eventType은 워크플로의 `repository_dispatch.types` 이름이다.
export type DispatchConfig = { repo: string; token: string; eventType: string };

// Notion 이벤트의 `type`과 `id`. GitHub 실행 기록에서 무엇 때문에 시작했는지 보려고 client_payload에 싣는다.
export type NotionEventInfo = { type: string; id?: string };

// GitHub가 지원하는 안정 버전이다. 이 요청에는 버전에 따라 바뀌는 동작이 없다.
const GITHUB_API_VERSION = '2022-11-28';

/**
 * GitHub repository_dispatch 요청(주소와 fetch 옵션)을 만든다.
 * @param config 저장소·토큰·이벤트 이름
 * @param notionEvent 시작하게 한 Notion 이벤트
 * @returns fetch에 넘길 주소와 옵션
 */
export function buildDispatchRequest(
  config: DispatchConfig,
  notionEvent: NotionEventInfo,
): { url: string; init: RequestInit } {
  return {
    url: `https://api.github.com/repos/${config.repo}/dispatches`,
    init: {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': GITHUB_API_VERSION,
        // GitHub API는 User-Agent가 없으면 거절한다
        'User-Agent': 'seojaewan-notion-webhook',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: config.eventType,
        client_payload: {
          notion_event_type: notionEvent.type,
          ...(notionEvent.id === undefined ? {} : { notion_event_id: notionEvent.id }),
        },
      }),
    },
  };
}
