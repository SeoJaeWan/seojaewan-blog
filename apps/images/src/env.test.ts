import { describe, expect, it } from 'vitest';

import { parseEnv } from './env.ts';

// @codocs [[배포 환경:환경 변수]]
describe('배포 환경:환경 변수', () => {
  it('Notion 토큰만 있으면 나머지는 기본값을 쓴다', () => {
    expect(parseEnv({ NOTION_TOKEN: 'token' })).toEqual({
      NOTION_TOKEN: 'token',
      IMAGE_STORE_DIR: '/srv/seojaewan-blog/images',
      HOST: '127.0.0.1',
      PORT: 3100,
    });
  });

  it('빈 값은 적지 않은 것으로 보고 기본값을 쓴다', () => {
    expect(
      parseEnv({
        NOTION_TOKEN: 'token',
        IMAGE_STORE_DIR: '',
        PORT: '',
        ALERT_URL: '',
        ALERT_SECRET: '',
      }),
    ).toMatchObject({
      IMAGE_STORE_DIR: '/srv/seojaewan-blog/images',
      PORT: 3100,
    });
  });

  it('저장 폴더, 듣는 주소와 포트, 알림 주소와 비밀값을 바꿀 수 있다', () => {
    expect(
      parseEnv({
        NOTION_TOKEN: 'token',
        IMAGE_STORE_DIR: '/data/images',
        HOST: '0.0.0.0',
        PORT: '3100',
        ALERT_URL: 'http://10.88.0.1:8790/notify',
        ALERT_SECRET: 'secret',
      }),
    ).toEqual({
      NOTION_TOKEN: 'token',
      IMAGE_STORE_DIR: '/data/images',
      HOST: '0.0.0.0',
      PORT: 3100,
      ALERT_URL: 'http://10.88.0.1:8790/notify',
      ALERT_SECRET: 'secret',
    });
  });

  it('Notion 토큰이 없으면 실패한다', () => {
    expect(() => parseEnv({})).toThrow(/NOTION_TOKEN/u);
  });

  it('알림 주소와 비밀값 가운데 하나만 있으면 실패하고 값은 알리지 않는다', () => {
    expect(() =>
      parseEnv({ NOTION_TOKEN: 'token', ALERT_URL: 'http://10.88.0.1:8790/notify' }),
    ).toThrow(/ALERT_SECRET/u);
    const error: unknown = (() => {
      try {
        return parseEnv({ NOTION_TOKEN: 'token', ALERT_SECRET: 'very-secret' });
      } catch (caught) {
        return caught;
      }
    })();
    expect(error).toBeInstanceOf(Error);
    expect(String(error)).not.toContain('very-secret');
  });
});
