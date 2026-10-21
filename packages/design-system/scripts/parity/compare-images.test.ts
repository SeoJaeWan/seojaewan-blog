// @vitest-environment node
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import { compareImages } from './compare-images.ts';

/**
 * 한 색으로 채운 이미지를 만든다.
 * @param width 폭
 * @param height 높이
 * @param rgba 채울 색
 * @returns 이미지
 */
function solid(width: number, height: number, rgba: readonly number[]): PNG {
  const image = new PNG({ width, height });
  for (let i = 0; i < image.data.length; i += 4) {
    image.data.set(rgba, i);
  }
  return image;
}

// @codocs [[피그마 일치 검사:CI 비교]]
describe('CI 비교', () => {
  it('같은 이미지는 통과한다', () => {
    expect(compareImages(solid(4, 4, [0, 95, 184, 255]), solid(4, 4, [0, 95, 184, 255]))).toEqual({
      status: 'pass',
      diffPixels: 0,
    });
  });

  it('색이 1만 달라도 실패하고 차이 이미지를 만든다', () => {
    const result = compareImages(solid(4, 4, [0, 95, 184, 255]), solid(4, 4, [0, 95, 185, 255]));
    expect(result.status).toBe('diff');
    expect(result.status === 'diff' && result.diffPixels).toBe(16);
  });

  it('크기가 다르면 비교하지 않고 실패한다', () => {
    const result = compareImages(solid(4, 4, [0, 0, 0, 255]), solid(5, 4, [0, 0, 0, 255]));
    expect(result).toEqual({
      status: 'size-mismatch',
      message: '이미지 크기가 다르다: 피그마 4×4px, 스토리 5×4px',
    });
  });
});
