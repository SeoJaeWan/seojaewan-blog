import { describe, expect, it, vi } from 'vitest';

import { getViewMenuEntries } from './view-menu-entries';

// @codocs [[Start 메뉴:모두]]
describe('Start 메뉴:모두', () => {
  it('보기 메뉴는 범주·그리드·간단히 차례이고 지금 보기에 확인 표시를 한다', () => {
    expect(getViewMenuEntries('grid', vi.fn())).toEqual([
      expect.objectContaining({ kind: 'checkbox', label: '범주', isChecked: false }),
      expect.objectContaining({ kind: 'checkbox', label: '그리드', isChecked: true }),
      expect.objectContaining({ kind: 'checkbox', label: '간단히', isChecked: false }),
    ]);
  });
});
