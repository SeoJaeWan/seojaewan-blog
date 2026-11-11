import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';

import { verifyNotionSignature } from './signature.ts';

// @codocs [[콘텐츠 원천:갱신 방식]]
const TOKEN = 'secret_test_verification_token';
const BODY = '{"type":"page.content_updated","id":"event-1"}';

function sign(body: string, token: string): string {
  return `sha256=${createHmac('sha256', token).update(body).digest('hex')}`;
}

describe('verifyNotionSignature', () => {
  it('본문을 토큰으로 HMAC-SHA256 한 서명이면 통과한다', async () => {
    expect(await verifyNotionSignature(BODY, sign(BODY, TOKEN), TOKEN)).toBe(true);
  });

  it('본문이 한 글자라도 다르면 거절한다', async () => {
    expect(await verifyNotionSignature(`${BODY} `, sign(BODY, TOKEN), TOKEN)).toBe(false);
  });

  it('다른 토큰으로 만든 서명이면 거절한다', async () => {
    expect(await verifyNotionSignature(BODY, sign(BODY, 'other'), TOKEN)).toBe(false);
  });

  it('헤더가 없거나 모양이 틀리면 거절한다', async () => {
    expect(await verifyNotionSignature(BODY, null, TOKEN)).toBe(false);
    expect(await verifyNotionSignature(BODY, '', TOKEN)).toBe(false);
    expect(await verifyNotionSignature(BODY, 'sha256=', TOKEN)).toBe(false);
    expect(await verifyNotionSignature(BODY, 'sha256=zz', TOKEN)).toBe(false);
    expect(await verifyNotionSignature(BODY, 'sha256=abc', TOKEN)).toBe(false);
    expect(
      await verifyNotionSignature(BODY, sign(BODY, TOKEN).slice('sha256='.length), TOKEN),
    ).toBe(false);
  });
});
