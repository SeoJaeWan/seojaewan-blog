import { describe, expect, it } from 'vitest';

import { getMobilePreviewLayout, getTaskbarOffset, getThumbnailScale } from './window-geometry';

// @codocs [[피그마 연동:모션 클래스]]
describe('디자인 기반:모션 클래스', () => {
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

// @codocs [[모바일:차이]]
describe('모바일:차이 - 창 미리보기 목록', () => {
  it('카드가 화면 폭 안에 들어가면 원래 너비(208)로 두고 목록은 카드에 맞춘다', () => {
    expect(getMobilePreviewLayout(390, 1)).toEqual({ listWidth: 218, cardWidth: 208 });
  });

  it('카드가 많아 넘치면 목록을 화면 폭에서 좌우 12px을 뺀 폭에 맞추고 카드를 같은 너비로 줄인다', () => {
    // 390 - 24 = 366, (366 - 10 - 4 * 2) / 3 = 116
    expect(getMobilePreviewLayout(390, 3)).toEqual({ listWidth: 366, cardWidth: 116 });
    const { listWidth, cardWidth } = getMobilePreviewLayout(390, 6);
    expect(listWidth).toBe(366);
    expect(cardWidth * 6 + 4 * 5 + 10).toBeLessThanOrEqual(listWidth);
  });
});
