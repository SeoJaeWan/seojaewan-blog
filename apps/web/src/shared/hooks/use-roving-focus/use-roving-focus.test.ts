import { describe, expect, it } from 'vitest';

import { getRovingTargetIndex } from './use-roving-focus';

const rowRects = [
  { left: 0, top: 0 },
  { left: 100, top: 0 },
  { left: 200, top: 0 },
];

const gridRects = [...rowRects, { left: 0, top: 80 }, { left: 100, top: 80 }];

// @codocs [[접근성:Tab]]
describe('접근성:Tab', () => {
  it('가로 묶음은 ←/→로 앞뒤 항목에 간다', () => {
    expect(getRovingTargetIndex('ArrowRight', 'horizontal', 0, rowRects)).toBe(1);
    expect(getRovingTargetIndex('ArrowLeft', 'horizontal', 1, rowRects)).toBe(0);
  });

  it('세로 묶음은 ↑/↓로 앞뒤 항목에 가고 ←/→는 받지 않는다', () => {
    expect(getRovingTargetIndex('ArrowDown', 'vertical', 0, rowRects)).toBe(1);
    expect(getRovingTargetIndex('ArrowUp', 'vertical', 1, rowRects)).toBe(0);
    expect(getRovingTargetIndex('ArrowRight', 'vertical', 0, rowRects)).toBeNull();
  });

  it('끝 항목에서는 멈춘다', () => {
    expect(getRovingTargetIndex('ArrowRight', 'horizontal', 2, rowRects)).toBeNull();
    expect(getRovingTargetIndex('ArrowLeft', 'horizontal', 0, rowRects)).toBeNull();
  });

  it('Home·End는 처음·끝 항목이다', () => {
    expect(getRovingTargetIndex('Home', 'vertical', 1, rowRects)).toBe(0);
    expect(getRovingTargetIndex('End', 'grid', 0, gridRects)).toBe(4);
  });

  it('격자는 위아래로 같은 칸의 항목에 간다', () => {
    expect(getRovingTargetIndex('ArrowDown', 'grid', 1, gridRects)).toBe(4);
    expect(getRovingTargetIndex('ArrowUp', 'grid', 3, gridRects)).toBe(0);
  });

  it('옮기는 키가 아니면 옮기지 않는다', () => {
    expect(getRovingTargetIndex('Enter', 'grid', 0, gridRects)).toBeNull();
  });
});
