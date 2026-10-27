import { describe, expect, it } from 'vitest';

import { getNextTabIndex, getTabIndexAt } from './use-tab-strip';

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

  it('탭에서 →를 누르면 다음 탭, 마지막 탭에서는 첫 탭이다', () => {
    expect(getNextTabIndex('ArrowRight', 0, 3)).toBe(1);
    expect(getNextTabIndex('ArrowRight', 2, 3)).toBe(0);
  });

  it('탭에서 ←를 누르면 앞 탭, 첫 탭에서는 마지막 탭이다', () => {
    expect(getNextTabIndex('ArrowLeft', 2, 3)).toBe(1);
    expect(getNextTabIndex('ArrowLeft', 0, 3)).toBe(2);
  });

  it('Home·End는 처음·끝 탭이다', () => {
    expect(getNextTabIndex('Home', 1, 3)).toBe(0);
    expect(getNextTabIndex('End', 1, 3)).toBe(2);
  });

  it('옮기는 키가 아니면 옮기지 않는다', () => {
    expect(getNextTabIndex('Enter', 1, 3)).toBeNull();
  });
});
