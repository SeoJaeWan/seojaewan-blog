// @vitest-environment node
import { PNG } from 'pngjs';
import { describe, expect, it } from 'vitest';

import { compareImages, compareVectorImages } from './compare-images.ts';

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

/**
 * 이미지 일부 픽셀을 다른 색으로 칠한다.
 * @param image 이미지
 * @param count 앞에서부터 칠할 픽셀 수
 * @param rgba 칠할 색
 * @returns 같은 이미지
 */
function paint(image: PNG, count: number, rgba: readonly number[]): PNG {
  for (let i = 0; i < count; i += 1) {
    image.data.set(rgba, i * 4);
  }
  return image;
}

/**
 * 20×10 흰 이미지를 만든다.
 * @returns 이미지
 */
function white(): PNG {
  return solid(20, 10, [255, 255, 255, 255]);
}

/**
 * 10×10 투명 이미지를 만든다.
 * @returns 이미지
 */
function clear(): PNG {
  return solid(10, 10, [0, 0, 0, 0]);
}

// @codocs [[피그마 일치 검사:픽셀 비교]]
describe('픽셀 비교', () => {
  it('렌더러 차이 수준의 작은 색 차이는 통과한다', () => {
    const result = compareImages(
      solid(10, 10, [0, 95, 184, 255]),
      solid(10, 10, [0, 96, 185, 255]),
    );
    expect(result.status).toBe('pass');
  });

  it('다른 픽셀이 넓이의 1.5% 이하면 통과하고, 넘으면 실패하고 차이 이미지를 만든다', () => {
    expect(compareImages(white(), paint(white(), 3, [0, 0, 0, 255])).status).toBe('pass');
    const result = compareImages(white(), paint(white(), 4, [0, 0, 0, 255]));
    expect(result.status).toBe('diff');
    expect(result.status === 'diff' && result.ratio).toBe(0.02);
  });

  it('크기가 다르면 비교하지 않고 실패한다', () => {
    const result = compareImages(solid(4, 4, [0, 0, 0, 255]), solid(5, 4, [0, 0, 0, 255]));
    expect(result).toEqual({
      status: 'size-mismatch',
      message: '이미지 크기가 다르다: 피그마 4×4px, 스토리 5×4px',
    });
  });
});

// @codocs [[피그마 일치 검사:벡터 비교]]
describe('벡터 비교', () => {
  it('채널 차이가 16 이하인 픽셀은 같은 모양으로 본다', () => {
    const result = compareVectorImages(solid(5, 5, [0, 0, 0, 100]), solid(5, 5, [0, 0, 0, 116]));
    expect(result).toMatchObject({ status: 'pass', diffPixels: 0 });
  });

  it('16을 넘게 다른 픽셀이 넓이의 4%를 넘으면 모양이 다르다', () => {
    expect(compareVectorImages(clear(), paint(clear(), 4, [0, 0, 0, 200])).status).toBe('pass');
    const result = compareVectorImages(clear(), paint(clear(), 5, [0, 0, 0, 200]));
    expect(result.status).toBe('diff');
  });
});
