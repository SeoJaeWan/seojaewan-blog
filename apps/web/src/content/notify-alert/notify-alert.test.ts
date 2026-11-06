import { afterEach, describe, expect, it, vi } from 'vitest';

import { postAlert } from './notify-alert';

vi.mock('server-only', () => ({}));

const target = { url: 'http://10.88.0.1:8790/notify', secret: 'alert-secret-value' };

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// @codocs [[알림 프로세스:결정]]
describe('알림 프로세스:결정', () => {
  it('notify 형식(Bearer 비밀값, JSON 본문)으로 보내고 202면 보낸 것이다', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(Response.json({ status: 'queued' }, { status: 202 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    expect(await postAlert({ title: '웹훅 실패', message: '이유', level: 'error' }, target)).toBe(
      'sent',
    );
    expect(fetchMock).toHaveBeenCalledWith(
      target.url,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: `Bearer ${target.secret}` }) as unknown,
        body: JSON.stringify({ level: 'error', title: '웹훅 실패', message: '이유' }),
      }),
    );
  });

  it('단계를 주지 않으면 info다', async () => {
    const fetchMock = vi.fn(() => Promise.resolve(new Response(null, { status: 202 })));
    vi.stubGlobal('fetch', fetchMock);
    await postAlert({ title: '알림' }, target);
    expect(fetchMock).toHaveBeenCalledWith(
      target.url,
      expect.objectContaining({ body: JSON.stringify({ level: 'info', title: '알림' }) }),
    );
  });

  it('거절되거나 닿지 않아도 던지지 않고, 로그에 비밀값과 알림 내용을 넣지 않는다', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve(new Response(null, { status: 401 }))),
    );
    expect(await postAlert({ title: '알림', message: '비밀 내용' }, target)).toBe('failed');
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );
    expect(await postAlert({ title: '알림', message: '비밀 내용' }, target)).toBe('failed');
    const logs = warn.mock.calls.flat().join('\n');
    expect(logs).not.toContain(target.secret);
    expect(logs).not.toContain('비밀 내용');
  });
});
