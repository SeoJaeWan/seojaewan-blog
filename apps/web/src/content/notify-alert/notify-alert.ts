import 'server-only';

import { env } from '@/env';

/** 알림 단계. notify가 받는 값이다 */
export type AlertLevel = 'info' | 'warn' | 'error';

/** 보낼 알림. title은 100자, message는 2000자까지이고 link는 `https://` 주소만 된다(notify가 정한 형식) */
export type Alert = {
  title: string;
  message?: string;
  level?: AlertLevel;
  link?: string;
};

/** 알림을 보낼 곳. url은 notify 주소(`ALERT_URL`), secret은 블로그(`blog`) 서비스 비밀값(`ALERT_SECRET`)이다 */
export type AlertTarget = {
  url: string;
  secret: string;
};

/** 알림을 보낸 결과. sent는 notify가 받음(202), skipped는 보낼 곳이 설정되지 않음, failed는 거절되거나 닿지 않음이다 */
export type AlertResult = 'sent' | 'skipped' | 'failed';

// notify가 응답하기를 기다리는 시간(밀리초). 응답만 확인하고 카카오 전달은 기다리지 않는다.
const ALERT_TIMEOUT_MS = 3000;

// notify가 접수했다는 응답 코드다.
const ACCEPTED_STATUS = 202;

/**
 * 블로그의 알림을 notify로 보낸다. 보낼 곳은 환경 변수(`ALERT_URL`, `ALERT_SECRET`)이고, 없으면 보내지 않는다.
 * 실패해도 던지지 않는다. 페이지와 웹훅 응답을 막지 않게, 부르는 쪽은 응답을 보낸 뒤(`after`)에 부른다.
 * @codocs [[알림 프로세스:결정]]
 * @codocs [[알림 프로세스:환경 변수]]
 * @param alert 보낼 알림
 * @returns 보낸 결과
 */
export async function notifyAlert(alert: Alert): Promise<AlertResult> {
  if (env.ALERT_URL === undefined || env.ALERT_SECRET === undefined) {
    console.warn(`[alert] ALERT_URL·ALERT_SECRET이 없어 알림을 보내지 않았다: ${alert.title}`);
    return 'skipped';
  }
  return postAlert(alert, { url: env.ALERT_URL, secret: env.ALERT_SECRET });
}

/**
 * 알림 하나를 notify에 보낸다. notify의 응답(202 접수)만 확인하고 기다리지 않는다. 정한 시간 안에 응답이 없거나 거절되면
 * 로그만 남기고 넘어간다(notify에 닿지 않는 경우는 notify가 따로 알린다). 로그에 비밀값과 알림 내용은 넣지 않는다.
 * 요청 형식은 local-server 저장소 `.codocs/foundation/notify.yaml`의 '다른 저장소에서 쓰기'를 따른다.
 * @codocs [[알림 프로세스:결정]]
 * @param alert 보낼 알림
 * @param target 보낼 곳
 * @returns 보낸 결과
 */
export async function postAlert(alert: Alert, target: AlertTarget): Promise<AlertResult> {
  try {
    const response = await fetch(target.url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${target.secret}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ level: 'info', ...alert }),
      signal: AbortSignal.timeout(ALERT_TIMEOUT_MS),
    });
    if (response.status === ACCEPTED_STATUS) {
      return 'sent';
    }
    console.warn(`[alert] notify가 알림을 받지 않았다(${String(response.status)})`);
    return 'failed';
  } catch (error) {
    const reason = error instanceof Error || error instanceof DOMException ? error.name : 'unknown';
    console.warn(`[alert] notify에 닿지 않았다(${reason})`);
    return 'failed';
  }
}
