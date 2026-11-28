import { describe, expect, it } from 'vitest';

import { utf8Encode } from './utf8';

// @codocs [[디자인 시스템:피그마 플러그인]]
describe('파일 내용을 UTF-8로 올린다', () => {
  it('문자열은 UTF-8 바이트로 인코딩한다', () => {
    expect(Array.from(utf8Encode('a버🙂'))).toEqual([
      0x61, 0xeb, 0xb2, 0x84, 0xf0, 0x9f, 0x99, 0x82,
    ]);
  });
});
