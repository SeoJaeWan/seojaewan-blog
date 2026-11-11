import { describe, expect, it } from 'vitest';

import { CAPTURE_VIEWPORT } from './capture-viewport.ts';

// @codocs [[피그마 연동:모션]]
describe('모션 검사 기본 화면', () => {
  it('노트북 구간(폭 1600 미만 또는 높이 900 미만)에 들지 않는 PC 구간 크기다', () => {
    expect(CAPTURE_VIEWPORT.width).toBeGreaterThanOrEqual(1600);
    expect(CAPTURE_VIEWPORT.height).toBeGreaterThanOrEqual(900);
  });
});
