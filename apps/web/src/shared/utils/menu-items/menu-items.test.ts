import { describe, expect, it, vi } from 'vitest';

import { emptyRecycleBinMenuItem, startPinMenuItem, taskbarPinMenuItem } from './menu-items';

// @codocs [[바탕화면:아이콘 우클릭 메뉴]]
describe('바탕화면:아이콘 우클릭 메뉴', () => {
  it('이미 Start에 고정된 항목은 시작 화면에 고정 대신 시작 화면에서 고정 해제를 보인다', () => {
    expect(startPinMenuItem(false, vi.fn()).label).toBe('시작 화면에 고정');
    expect(startPinMenuItem(true, vi.fn()).label).toBe('시작 화면에서 고정 해제');
  });
});

// @codocs [[파일 탐색기:구성]]
describe('파일 탐색기:구성', () => {
  it('휴지통 비우기는 휴지통이 비었을 때 비활성이다', () => {
    expect(emptyRecycleBinMenuItem(true, vi.fn()).disabled).toBe(true);
    expect(emptyRecycleBinMenuItem(false, vi.fn()).disabled).toBe(false);
  });
});

// @codocs [[작업 표시줄:우클릭 메뉴]]
describe('작업 표시줄:우클릭 메뉴', () => {
  it('작업 표시줄에 고정한 앱은 작업 표시줄에서 고정 해제를 보인다', () => {
    expect(taskbarPinMenuItem(false, vi.fn()).label).toBe('작업 표시줄에 고정');
    expect(taskbarPinMenuItem(true, vi.fn()).label).toBe('작업 표시줄에서 고정 해제');
  });
});
