import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getDesktopMenuEntries } from './empty-menu-entries';

const MENU_OPTIONS = {
  iconSize: 'medium',
  isAutoArrange: true,
  isAutoArrangeLocked: false,
  isMobile: false,
  sortBy: 'name',
  onIconSizeChange: vi.fn(),
  onAutoArrangeChange: vi.fn(),
  onSortByChange: vi.fn(),
  onRefresh: vi.fn(),
  canPaste: true,
  onPaste: vi.fn(),
  onNewFolder: vi.fn(),
} as const;

/**
 * 메뉴 항목의 이름들(구분선은 `-`).
 * @param entries 메뉴 항목
 * @returns 이름
 */
function labels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => ('label' in entry ? entry.label : '-'));
}

// @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
describe('바탕화면 우클릭 메뉴:빈 곳', () => {
  it('보기·정렬 기준·새로 고침·붙여넣기·새로 만들기 메뉴다', () => {
    expect(labels(getDesktopMenuEntries(MENU_OPTIONS))).toEqual([
      '보기',
      '정렬 기준',
      '새로 고침',
      '-',
      '붙여넣기',
      '새로 만들기',
    ]);
  });

  it('붙여넣을 것이 없으면 붙여넣기를 고를 수 없다', () => {
    const entries = getDesktopMenuEntries({ ...MENU_OPTIONS, canPaste: false });
    expect(entries.find((entry) => 'label' in entry && entry.label === '붙여넣기')).toMatchObject({
      isDisabled: true,
    });
  });
});
