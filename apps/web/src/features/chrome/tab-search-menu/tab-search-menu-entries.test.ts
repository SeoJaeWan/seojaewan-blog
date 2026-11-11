import { describe, expect, it, vi } from 'vitest';

import { getChromeTabSearchMenuEntries } from './tab-search-menu-entries';

const tabs = [{ title: '새 탭' }, { title: 'React 19 훅 정리' }, { title: '리액트 - 검색' }];

// @codocs [[Chrome:구성]]
describe('Chrome:구성', () => {
  it('탭 검색 메뉴는 열린 탭을 탭 줄 순서대로 글 아이콘과 제목으로 보인다', () => {
    const entries = getChromeTabSearchMenuEntries(tabs, vi.fn());
    expect(entries.map((entry) => entry.label)).toEqual([
      '새 탭',
      'React 19 훅 정리',
      '리액트 - 검색',
    ]);
    expect(new Set(entries.map((entry) => entry.icon))).toEqual(
      new Set(['icons/ic_material_description_20_outlined.svg']),
    );
  });

  it('탭 항목을 고르면 그 탭의 차례로 옮긴다', () => {
    const onTabSelect = vi.fn();
    getChromeTabSearchMenuEntries(tabs, onTabSelect)[2]?.onClick?.();
    expect(onTabSelect).toHaveBeenCalledWith(2);
  });
});
