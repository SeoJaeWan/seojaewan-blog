import { describe, expect, it } from 'vitest';

import { getTabIndexAt } from './use-tab-strip';

/**
 * 가로 자리만 있는 탭 요소를 만든다.
 * @param left 왼쪽
 * @param width 너비
 * @returns 탭 요소
 */
function tab(left: number, width: number): Element {
  const element = document.createElement('div');
  element.getBoundingClientRect = () => DOMRect.fromRect({ x: left, y: 0, width, height: 32 });
  return element;
}

const tabs = [tab(0, 100), tab(100, 100), tab(200, 100)];

// @codocs [[파일 탐색기:탭]]
describe('파일 탐색기:탭', () => {
  it('끄는 탭은 포인터 가로 자리에 있는 탭 자리로 간다', () => {
    expect(getTabIndexAt(tabs, 150)).toBe(1);
  });

  it('마지막 탭보다 오른쪽이면 마지막 자리다', () => {
    expect(getTabIndexAt(tabs, 400)).toBe(2);
  });

  it('첫 탭보다 왼쪽이면 첫 자리다', () => {
    expect(getTabIndexAt(tabs, -20)).toBe(0);
  });
});
