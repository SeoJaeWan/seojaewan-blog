import { describe, expect, it } from 'vitest';

import { rasterExtension } from './image-format';

// @codocs [[피그마 연동:자산]]
describe('래스터 자산의 확장자', () => {
  it('바이트 앞부분(매직넘버)으로 실제 형식을 알아낸다', () => {
    expect(rasterExtension(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe('png');
    expect(rasterExtension(bytes([0xff, 0xd8, 0xff, 0xe0]))).toBe('jpg');
    expect(rasterExtension(bytes([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]))).toBe('gif');
    expect(
      rasterExtension(bytes([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])),
    ).toBe('webp');
  });

  it('모르는 형식이면 정하지 않는다(내보내기는 PNG로 다시 내보낸다)', () => {
    expect(rasterExtension(Uint8Array.from([0x3c, 0x73, 0x76, 0x67]))).toBeUndefined();
    expect(rasterExtension(new Uint8Array())).toBeUndefined();
  });
});

/**
 * 숫자 목록으로 바이트를 만든다.
 * @param values 바이트 값
 * @returns 바이트
 */
function bytes(values: number[]): Uint8Array {
  return Uint8Array.from(values);
}
