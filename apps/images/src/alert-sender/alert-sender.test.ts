import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createFakeFetch, jsonResponse } from '../fake-fetch/fake-fetch.fixture.ts';
import { createAlertSender } from './alert-sender.ts';

const ALERT_URL = 'http://10.88.0.1:8790/notify';
const SECRET = 'images-secret';
const ALERT = {
  title: 'Notion 이미지를 가져오지 못했다',
  message: 'block/x/y: 실패',
  level: 'error',
} as const;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// @codocs [[알림 프로세스:결정]]
describe('알림 프로세스:결정', () => {
  it('notify 주소로 비밀값과 함께 제목·메시지·수준을 보낸다', async () => {
    const { fetch, requests } = createFakeFetch(() => jsonResponse({ status: 'queued' }, 202));
    await createAlertSender({ url: ALERT_URL, secret: SECRET, fetch }).send(ALERT);
    expect(requests).toHaveLength(1);
    expect(requests[0]).toMatchObject({ url: ALERT_URL, method: 'POST' });
    expect(requests[0]?.headers.get('Authorization')).toBe(`Bearer ${SECRET}`);
    expect(requests[0]?.headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(requests[0]?.body ?? '')).toEqual(ALERT);
  });

  it('보내기가 실패해도 오류를 던지지 않는다', async () => {
    const sender = createAlertSender({
      url: ALERT_URL,
      secret: SECRET,
      fetch: () => Promise.reject(new Error('ECONNREFUSED')),
    });
    await expect(sender.send(ALERT)).resolves.toBeUndefined();
    const rejected = createFakeFetch(() => jsonResponse({}, 401));
    await expect(
      createAlertSender({ url: ALERT_URL, secret: SECRET, fetch: rejected.fetch }).send(ALERT),
    ).resolves.toBeUndefined();
  });

  it('주소와 비밀값이 없으면 보내지 않고 로그만 남긴다', async () => {
    const { fetch, requests } = createFakeFetch(() => jsonResponse({}, 202));
    await createAlertSender({ url: undefined, secret: undefined, fetch }).send(ALERT);
    expect(requests).toHaveLength(0);
    expect(console.error).toHaveBeenCalled();
  });

  it('같은 제목은 10분에 한 번만 보낸다', async () => {
    let now = 0;
    const { fetch, requests } = createFakeFetch(() => jsonResponse({ status: 'queued' }, 202));
    const sender = createAlertSender({ url: ALERT_URL, secret: SECRET, fetch, now: () => now });
    await sender.send(ALERT);
    now = 9 * 60 * 1000;
    await sender.send({ ...ALERT, message: '다른 이미지' });
    await sender.send({ ...ALERT, title: '다른 제목' });
    now = 10 * 60 * 1000;
    await sender.send(ALERT);
    expect(
      requests.map((request) => (JSON.parse(request.body ?? '') as { title: string }).title),
    ).toEqual([ALERT.title, '다른 제목', ALERT.title]);
  });
});
