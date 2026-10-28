import { describe, expect, it } from 'vitest';

import { canZoomIn, canZoomOut, formatZoom, ZOOM_LEVELS, zoomIn, zoomOut } from './chrome-zoom';

// @codocs [[Chrome:확대/축소]]
describe('Chrome:확대/축소', () => {
  it('단계는 50·67·75·80·90·100·110·125·150·175·200%다', () => {
    expect(ZOOM_LEVELS).toEqual([50, 67, 75, 80, 90, 100, 110, 125, 150, 175, 200]);
  });

  it('키우면 다음 단계, 줄이면 앞 단계로 간다', () => {
    expect(zoomIn(100)).toBe(110);
    expect(zoomIn(50)).toBe(67);
    expect(zoomOut(100)).toBe(90);
    expect(zoomOut(67)).toBe(50);
  });

  it('끝 단계에서는 더 가지 않고 그쪽 버튼이 비활성이다', () => {
    expect(zoomIn(200)).toBe(200);
    expect(zoomOut(50)).toBe(50);
    expect(canZoomIn(200)).toBe(false);
    expect(canZoomOut(50)).toBe(false);
    expect(canZoomIn(175)).toBe(true);
    expect(canZoomOut(67)).toBe(true);
  });

  it('배율은 퍼센트 글자로 보인다', () => {
    expect(formatZoom(125)).toBe('125%');
  });
});
