import { describe, expect, it } from 'vitest';

import { gitBlobSha, sha1Hex } from './git-blob';
import { utf8Encode } from './utf8';

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('바뀐 파일만 올린다', () => {
  it('blob SHA-1은 git hash-object와 같다', () => {
    expect(gitBlobSha(new Uint8Array())).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    expect(gitBlobSha(utf8Encode('hello\n'))).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });

  it('SHA-1은 64바이트를 넘는 입력과 한글도 맞게 계산한다', () => {
    expect(sha1Hex(utf8Encode('abc'))).toBe('a9993e364706816aba3e25717850c26c9cd0d89d');
    expect(sha1Hex(utf8Encode('a'.repeat(1000)))).toBe('291e9a6c66994949b57ba5e650361e98fc36b1ba');
    expect(gitBlobSha(utf8Encode('버튼\n'))).toBe('7fa17fd1583a3ff7dacd3cb4a2aec16a3195ffa3');
  });
});
