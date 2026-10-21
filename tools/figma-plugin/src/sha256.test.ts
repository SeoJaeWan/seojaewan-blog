import { describe, expect, it } from 'vitest';

import { sha256Hex, utf8Encode } from './sha256';

// @codocs [[피그마 일치 검사:피그마 플러그인]]
describe('컴포넌트마다 내용 해시를 계산한다', () => {
  it('SHA-256 표준 예제 값과 같다', () => {
    expect(sha256Hex(new Uint8Array())).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
    expect(sha256Hex(utf8Encode('abc'))).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('블록 경계를 넘는 긴 입력도 표준 예제 값과 같다', () => {
    expect(sha256Hex(utf8Encode('abcdbcdecdefdefgefghfghighijhijkijkljklmklmnlmnomnopnopq'))).toBe(
      '248d6a61d20638b8e5c026930c3e6039a33ce45964ff2167f6ecedd419db06c1',
    );
    expect(sha256Hex(new Uint8Array(1_000_000).fill(0x61))).toBe(
      'cdc76e5c9914fb9281a1c7e284d73e67f1809a48a497200e046d39ccc7112cd0',
    );
  });

  it('문자열은 UTF-8 바이트로 인코딩한다', () => {
    expect(Array.from(utf8Encode('a버🙂'))).toEqual([
      0x61, 0xeb, 0xb2, 0x84, 0xf0, 0x9f, 0x99, 0x82,
    ]);
  });
});
