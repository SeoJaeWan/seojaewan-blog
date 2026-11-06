import { describe, expect, it, vi } from 'vitest';

import { parseEnv } from './env';

vi.mock('server-only', () => ({}));

const TOKEN = 'ntn_test_token_value';

// @codocs [[배포 환경:환경 변수]]
describe('배포 환경:환경 변수', () => {
  it('CONTENT_SOURCE가 없으면 notion이다', () => {
    expect(parseEnv({}).CONTENT_SOURCE).toBe('notion');
  });

  it('CONTENT_SOURCE가 빈 값이면 적지 않은 것으로 보고 notion이다', () => {
    expect(parseEnv({ CONTENT_SOURCE: '' }).CONTENT_SOURCE).toBe('notion');
  });

  it('블로그는 Notion을 부르지 않아 NOTION_TOKEN이 없어도 된다', () => {
    expect(parseEnv({ CONTENT_SOURCE: 'notion' })).toEqual({ CONTENT_SOURCE: 'notion' });
    expect(parseEnv({ CONTENT_SOURCE: 'fixture' })).toEqual({ CONTENT_SOURCE: 'fixture' });
  });

  it('notion·fixture가 아닌 CONTENT_SOURCE는 거부한다', () => {
    expect(() => parseEnv({ CONTENT_SOURCE: 'mdx' })).toThrow('CONTENT_SOURCE');
  });

  it('검증 오류에 환경 변수 값을 넣지 않는다', () => {
    let message = '';
    try {
      parseEnv({ CONTENT_SOURCE: TOKEN });
    } catch (error) {
      message = error instanceof Error ? error.message : '';
    }
    expect(message).toContain('CONTENT_SOURCE');
    expect(message).not.toContain(TOKEN);
  });
});
