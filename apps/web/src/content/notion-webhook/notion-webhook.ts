import 'server-only';

import { createHmac, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';

import { CONTENT_INDEX_TAG, getPageCacheTag } from '@/content/content-cache/content-cache';
import type { Alert } from '@/content/notify-alert/notify-alert';

/** Notion이 서명을 넣는 요청 머리 */
export const NOTION_SIGNATURE_HEADER = 'x-notion-signature';

// 서명 값의 머리다(`sha256=<16진수>`).
const SIGNATURE_PREFIX = 'sha256=';

/** 웹훅 요청 하나를 받아 할 일. status는 응답 코드, tags는 다시 만들 캐시 태그, alert는 응답을 보낸 뒤 notify로 보낼 알림이다 */
export type NotionWebhookDecision = {
  status: number;
  tags: readonly string[];
  alert: Alert | null;
};

/** 웹훅 요청 하나. body는 받은 그대로의 본문, signature는 서명 머리 값, secret은 서명 검증 비밀값(`NOTION_WEBHOOK_SECRET`)이다 */
export type NotionWebhookRequest = {
  body: string;
  signature: string | null;
  secret: string | undefined;
};

// 구독을 만들 때 Notion이 한 번 보내는 확인 요청이다. 확인 토큰이 곧 서명 검증 비밀값이다.
const verificationSchema = z.object({ verification_token: z.string().min(1) });

// 이벤트에서 블로그가 읽는 부분. 바뀐 대상(entity)의 ID와 종류다.
const eventSchema = z.object({
  type: z.string(),
  entity: z.object({ id: z.string().min(1), type: z.string() }),
});

/**
 * Notion 웹훅 서명을 검증한다. 받은 본문 그대로를 비밀값으로 HMAC-SHA256한 16진수가 `sha256=` 뒤의 값과 같아야 한다.
 * 비교는 시간이 일정한 비교(`timingSafeEqual`)로 한다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @param body 받은 그대로의 본문
 * @param signature 서명 머리(`X-Notion-Signature`) 값
 * @param secret 서명 검증 비밀값(연동의 확인 토큰)
 * @returns 맞으면 true
 */
export function verifyNotionSignature(
  body: string,
  signature: string | null,
  secret: string,
): boolean {
  if (signature?.startsWith(SIGNATURE_PREFIX) !== true) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(body).digest();
  const received = Buffer.from(signature.slice(SIGNATURE_PREFIX.length), 'hex');
  return received.length === expected.length && timingSafeEqual(received, expected);
}

/**
 * 웹훅 요청 하나에 할 일을 정한다. 라우트는 정한 태그를 다시 만들고, 알림은 응답을 보낸 뒤에 보낸다.
 * - 처음 구독할 때의 확인 요청(`verification_token`): 비밀값이 아직 없으면 그 토큰을 notify로 보내 카카오톡으로 받게 한다.
 *   사람이 그 값을 Notion 화면과 `NOTION_WEBHOOK_SECRET`에 넣는다. 저장소와 로그에는 남기지 않는다.
 *   비밀값이 이미 있으면 보내지 않는다(누구나 보낼 수 있는 요청이라 알림을 아무나 일으키지 못하게 한다).
 * - 비밀값이 없으면 그 밖의 요청을 모두 거절하고 알린다.
 * - 서명이 맞지 않으면 거절한다. 누구나 보낼 수 있으므로 알리지 않는다.
 * - 서명이 맞으면 공개 여부를 보지 않고 목록 태그와 바뀐 페이지의 태그를 다시 만든다. 페이지가 아닌 대상(데이터 소스 등)은 목록만이다.
 * - 서명이 맞는데 읽을 수 없는 본문이면 라우트 실패로 보고 알린다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @codocs [[콘텐츠 원천:연동 토큰]]
 * @param request 웹훅 요청
 * @returns 할 일
 */
export function decideNotionWebhook(request: NotionWebhookRequest): NotionWebhookDecision {
  const json = parseJson(request.body);
  const verification = verificationSchema.safeParse(json);
  if (verification.success) {
    return {
      status: 200,
      tags: [],
      alert:
        request.secret === undefined
          ? {
              title: 'Notion 웹훅 확인 토큰',
              message: verification.data.verification_token,
              level: 'warn',
            }
          : null,
    };
  }
  if (request.secret === undefined) {
    return {
      status: 503,
      tags: [],
      alert: {
        title: 'Notion 웹훅 거절',
        message: 'NOTION_WEBHOOK_SECRET이 없어 웹훅을 거절했다',
        level: 'error',
      },
    };
  }
  if (!verifyNotionSignature(request.body, request.signature, request.secret)) {
    return { status: 401, tags: [], alert: null };
  }
  const event = eventSchema.safeParse(json);
  if (!event.success) {
    return {
      status: 400,
      tags: [],
      alert: {
        title: 'Notion 웹훅 실패',
        message: '서명은 맞지만 이벤트를 읽지 못했다',
        level: 'error',
      },
    };
  }
  const { entity } = event.data;
  return {
    status: 200,
    tags:
      entity.type === 'page'
        ? [CONTENT_INDEX_TAG, getPageCacheTag(entity.id)]
        : [CONTENT_INDEX_TAG],
    alert: null,
  };
}

/**
 * 본문을 JSON으로 읽는다.
 * @param body 본문
 * @returns 읽은 값. JSON이 아니면 undefined
 */
function parseJson(body: string): unknown {
  try {
    return JSON.parse(body);
  } catch {
    return undefined;
  }
}
