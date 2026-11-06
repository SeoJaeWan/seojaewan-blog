import { revalidateTag } from 'next/cache';
import { after } from 'next/server';

import { type Alert, notifyAlert } from '@/content/notify-alert/notify-alert';
import {
  decideNotionWebhook,
  NOTION_SIGNATURE_HEADER,
} from '@/content/notion-webhook/notion-webhook';
import { env } from '@/env';

/**
 * Notion 웹훅을 받아 바뀐 글과 목록의 캐시를 다시 만든다(`revalidateTag`). 다음 요청이 옛 내용을 보지 않고 새로 만들도록
 * 바로 만료시킨다(`expire: 0`). 할 일은 `decideNotionWebhook`이 정하고, 알림은 응답을 보낸 뒤(`after`) notify로 보낸다.
 * 다시 만들다 실패하면 500으로 답하고 알린다.
 * @codocs [[콘텐츠 원천:갱신 방식]]
 * @codocs [[알림 프로세스:결정]]
 * @param request 요청
 * @returns 빈 응답
 */
export async function POST(request: Request): Promise<Response> {
  const decision = decideNotionWebhook({
    body: await request.text(),
    signature: request.headers.get(NOTION_SIGNATURE_HEADER),
    secret: env.NOTION_WEBHOOK_SECRET,
  });
  let { status, alert } = decision;
  try {
    for (const tag of decision.tags) {
      revalidateTag(tag, { expire: 0 });
    }
  } catch (error) {
    status = 500;
    alert = {
      title: 'Notion 웹훅 실패',
      message: `캐시를 다시 만들지 못했다: ${error instanceof Error ? error.message : 'unknown'}`,
      level: 'error',
    };
  }
  if (alert !== null) {
    scheduleAlert(alert);
  }
  return new Response(null, { status });
}

/**
 * 응답을 보낸 뒤 알림을 보낸다. 알림이 느리거나 실패해도 웹훅 응답을 막지 않는다.
 * @param alert 보낼 알림
 */
function scheduleAlert(alert: Alert): void {
  after(async () => {
    await notifyAlert(alert);
  });
}
