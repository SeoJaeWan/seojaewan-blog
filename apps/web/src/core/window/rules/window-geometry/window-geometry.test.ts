import { describe, expect, it } from 'vitest';

import { getTaskbarOffset, getThumbnailScale } from './window-geometry';

// @codocs [[디자인 기반:모션 클래스]]
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
