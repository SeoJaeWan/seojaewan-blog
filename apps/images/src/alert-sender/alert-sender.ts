/** 알림 하나. 메시지 앞의 `[images]`는 notify가 서비스 이름으로 붙인다 */
export type Alert = {
  title: string;
  message: string;
  level: 'info' | 'warn' | 'error';
};

/** 알림을 보낸다. 보내기가 실패해도 오류를 던지지 않는다 */
export type AlertSender = {
  send: (alert: Alert) => Promise<void>;
};

/** 같은 제목의 알림을 다시 보내지 않는 시간(밀리초). notify가 시간당 받는 수에 한도가 있다 */
const ALERT_QUIET_MS = 600_000;

/** notify가 받는 메시지의 가장 긴 길이 */
const MAX_MESSAGE_LENGTH = 2000;

/** notify 응답을 기다리는 시간(밀리초) */
const ALERT_TIMEOUT_MS = 5_000;

/**
 * local-server의 notify로 알림을 보내는 함수를 만든다.
 * 주소나 비밀값이 없으면(로컬 개발) 로그만 남긴다. 보내기가 실패해도 로그만 남기고 넘어간다.
 * 같은 제목은 10분에 한 번만 보낸다. Notion이 멈추면 이미지마다 같은 실패가 나기 때문이다.
 * @codocs [[알림 프로세스:결정]]
 * @param options 만들기 설정
 * @param options.url notify 주소(`ALERT_URL`)
 * @param options.secret 서비스 `images`의 비밀값(`ALERT_SECRET`)
 * @param options.fetch HTTP 요청 함수. 시험에서 가짜 응답을 넣는다
 * @param options.now 지금 시각(밀리초). 시험에서 시간을 정한다
 * @returns 알림을 보내는 함수
 */
export function createAlertSender({
  url,
  secret,
  fetch = globalThis.fetch,
  now = Date.now,
}: {
  url: string | undefined;
  secret: string | undefined;
  fetch?: typeof globalThis.fetch;
  now?: () => number;
}): AlertSender {
  const lastSentAt = new Map<string, number>();
  return {
    async send(alert) {
      console.error(`[images] ${alert.title}: ${alert.message}`);
      if (url === undefined || secret === undefined) {
        return;
      }
      const sentAt = lastSentAt.get(alert.title);
      if (sentAt !== undefined && now() - sentAt < ALERT_QUIET_MS) {
        return;
      }
      lastSentAt.set(alert.title, now());
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...alert, message: alert.message.slice(0, MAX_MESSAGE_LENGTH) }),
          signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
        });
        if (!response.ok) {
          console.error(`[images] 알림을 보내지 못했다(${String(response.status)})`);
        }
      } catch (error) {
        console.error(
          `[images] 알림을 보내지 못했다: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    },
  };
}
