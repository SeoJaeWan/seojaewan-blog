import { describe, expect, it } from 'vitest';

import { describeError } from './error-text';

// @codocs [[피그마 연동:피그마 플러그인]]
describe('describeError', () => {
  it('Error는 message를 쓴다', () => {
    expect(describeError(new Error('깨졌다'))).toBe('깨졌다');
  });

  it('Error가 아닌 객체는 [object Object]가 아니라 message와 status·type을 보여 준다', () => {
    const text = describeError({ message: 'Failed to fetch', status: 503, type: 'network' });
    expect(text).toBe('Failed to fetch (status=503, type=network)');
  });

  it('message가 없는 객체는 JSON 요약을 보여 준다', () => {
    expect(describeError({ reason: 'timeout' })).toBe('{"reason":"timeout"}');
  });

  it('내용 없는 객체와 순환 객체도 읽을 수 있는 문장이다', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(describeError({})).not.toContain('[object Object]');
    expect(describeError(cyclic)).not.toContain('[object Object]');
  });

  it('문자열과 원시 값을 그대로 보여 준다', () => {
    expect(describeError('끊김')).toBe('끊김');
    expect(describeError(undefined)).toBe('undefined');
  });

  it('토큰 모양의 글자는 가리고 긴 문장은 줄인다', () => {
    const text = describeError({ message: 'Bearer abc123 github_pat_11AAAA_secret ghp_xyz' });
    expect(text).toBe('*** *** ***');
    expect(describeError('가'.repeat(1000)).length).toBeLessThan(400);
  });
});
