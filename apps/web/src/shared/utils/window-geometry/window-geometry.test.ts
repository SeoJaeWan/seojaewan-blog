import { describe, expect, it } from 'vitest';

import {
  getMobilePreviewListWidth,
  getPreviewCardWidth,
  getPreviewThumbnailBox,
  getTaskbarOffset,
  getThumbnailScale,
  getWindowAspectRatio,
} from './window-geometry';

// @codocs [[피그마 연동:모션 클래스]]
describe('피그마 연동:모션 클래스', () => {
  it('최소화 도착 위치는 창 중심에서 작업 표시줄 앱 버튼 중심까지의 거리다', () => {
    const windowRect = { left: 448, top: 196, width: 1024, height: 640 };
    const buttonRect = { left: 940, top: 1036, width: 40, height: 40 };
    expect(getTaskbarOffset(windowRect, buttonRect)).toEqual({ x: 0, y: 540 });
  });
});

describe('getThumbnailScale', () => {
  it('창 전체가 축소 화면 자리에 들어가는 비율을 고른다', () => {
    expect(getThumbnailScale({ width: 1024, height: 640 }, { width: 192, height: 108 })).toBe(
      108 / 640,
    );
    expect(getThumbnailScale({ width: 1920, height: 640 }, { width: 192, height: 108 })).toBe(0.1);
  });
});

// @codocs [[작업 표시줄:창 미리보기]]
describe('작업 표시줄:창 미리보기 - 카드 폭', () => {
  it('카드 폭은 축소 화면 높이(108) × 창 비율 + 좌우 여백(8씩)이다', () => {
    // 1024×640 창: 108 × 1.6 + 16 = 188.8
    expect(getPreviewCardWidth(getWindowAspectRatio({ width: 1024, height: 640 }))).toBeCloseTo(
      188.8,
    );
    // 세로로 긴 창(카카오톡 같은 비율)은 좁다
    expect(getPreviewCardWidth(0.75)).toBe(97);
  });

  it('넓은 창은 최대 폭(208)에서 멈춘다', () => {
    expect(getPreviewCardWidth(getWindowAspectRatio({ width: 1920, height: 1032 }))).toBe(208);
  });

  it('창 비율 폭의 카드는 축소 화면이 자리를 꽉 채운다', () => {
    const size = { width: 1024, height: 640 };
    const box = getPreviewThumbnailBox(getPreviewCardWidth(getWindowAspectRatio(size)));
    const scale = getThumbnailScale(size, box);
    expect(size.width * scale).toBeCloseTo(box.width);
    expect(size.height * scale).toBeCloseTo(box.height);
  });
});

// @codocs [[작업 표시줄:모바일]]
describe('작업 표시줄:모바일 - 창 미리보기 목록', () => {
  it('목록 너비는 화면 폭에서 좌우 12px을 뺀 폭이다', () => {
    expect(getMobilePreviewListWidth(390)).toBe(366);
    expect(getMobilePreviewListWidth(412)).toBe(388);
  });
});
