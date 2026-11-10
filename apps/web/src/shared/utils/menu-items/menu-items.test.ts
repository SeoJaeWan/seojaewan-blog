import { describe, expect, it, vi } from 'vitest';

import {
  emptyRecycleBinMenuItem,
  singleChoiceEntry,
  startPinMenuItem,
  taskbarPinMenuItem,
} from './menu-items';

// @codocs [[바탕화면 우클릭 메뉴:아이콘]]
describe('바탕화면 우클릭 메뉴:아이콘', () => {
  it('이미 Start에 고정된 항목은 시작 화면에 고정 대신 시작 화면에서 고정 해제를 보인다', () => {
    expect(startPinMenuItem(false, vi.fn()).label).toBe('시작 화면에 고정');
    expect(startPinMenuItem(true, vi.fn()).label).toBe('시작 화면에서 고정 해제');
  });
});

// @codocs [[파일 탐색기:구성]]
describe('파일 탐색기:구성', () => {
  it('휴지통 비우기는 휴지통이 비었을 때 비활성이다', () => {
    expect(emptyRecycleBinMenuItem(true, vi.fn()).isDisabled).toBe(true);
    expect(emptyRecycleBinMenuItem(false, vi.fn()).isDisabled).toBe(false);
  });
});

// @codocs [[작업 표시줄:우클릭 메뉴]]
describe('작업 표시줄:우클릭 메뉴', () => {
  it('작업 표시줄에 고정한 앱은 작업 표시줄에서 제거를 보인다', () => {
    expect(taskbarPinMenuItem(false, vi.fn()).label).toBe('작업 표시줄에 고정');
    expect(taskbarPinMenuItem(true, vi.fn()).label).toBe('작업 표시줄에서 제거');
  });
});

// @codocs [[파일 탐색기:보기와 정렬]]
describe('파일 탐색기:보기와 정렬', () => {
  const options = [
    { value: 'name', label: '이름' },
    { value: 'type', label: '유형' },
  ] as const;

  it('선택지에 있는 값을 고르면 알린다', () => {
    const handleChange = vi.fn();
    singleChoiceEntry('name', options, handleChange).onValueChange?.('type');
    expect(handleChange).toHaveBeenCalledWith('type');
  });

  it('선택지에 없는 값은 무시한다', () => {
    const handleChange = vi.fn();
    singleChoiceEntry('name', options, handleChange).onValueChange?.('modified');
    expect(handleChange).not.toHaveBeenCalled();
  });
});
