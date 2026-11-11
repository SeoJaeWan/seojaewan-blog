// @codocs [[콘텐츠 원천:갱신 방식]]
// Notion 웹훅의 `X-Notion-Signature`(`sha256=<본문을 verification_token으로 HMAC-SHA256 한 16진수>`)를 확인한다.
// https://developers.notion.com/reference/webhooks

const SIGNATURE_PREFIX = 'sha256=';

/**
 * 16진수 문자열을 바이트로 바꾼다.
 * @param hex 짝수 길이의 16진수 문자열
 * @returns 바이트. 16진수가 아니거나 비었거나 길이가 홀수면 null
 */
function hexToBytes(hex: string): Uint8Array<ArrayBuffer> | null {
  if (hex.length === 0 || hex.length % 2 !== 0 || !/^[0-9a-fA-F]+$/.test(hex)) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

/**
 * 받은 본문 그대로(다시 직렬화하지 않은 바이트)와 서명 헤더가 맞는지 본다.
 * 비교는 `crypto.subtle.verify`가 하므로 상수 시간이다. 헤더가 없거나 모양이 틀리면 false다.
 * @param rawBody 받은 본문 그대로의 문자열
 * @param signatureHeader `X-Notion-Signature` 헤더 값. 없으면 null
 * @param verificationToken Notion 구독의 verification_token
 * @returns 서명이 맞으면 true
 */
export async function verifyNotionSignature(
  rawBody: string,
  signatureHeader: string | null,
  verificationToken: string,
): Promise<boolean> {
  if (signatureHeader === null || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
    return false;
  }
  const signature = hexToBytes(signatureHeader.slice(SIGNATURE_PREFIX.length));
  if (signature === null) {
    return false;
  }
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(verificationToken),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['verify'],
  );
  return crypto.subtle.verify('HMAC', key, signature, encoder.encode(rawBody));
}
