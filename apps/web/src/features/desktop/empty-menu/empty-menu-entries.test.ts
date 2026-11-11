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
 * 메뉴 항목의 이름들(구분선은 `-`, 단추 줄은 `[단추|단추]`).
 * @param entries 메뉴 항목
 * @returns 이름
 */
function labels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => {
    if (entry.kind === 'command-bar') {
      return `[${entry.buttons.map((button) => button.label).join('|')}]`;
    }
    return 'label' in entry ? entry.label : '-';
  });
}

// @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
describe('바탕화면 우클릭 메뉴:빈 곳', () => {
  it('붙여넣을 수 있으면 단추 줄 붙여넣기와 목록 보기·정렬 기준·새로 고침·새로 만들기다', () => {
    expect(labels(getDesktopMenuEntries(MENU_OPTIONS))).toEqual([
      '[붙여넣기]',
      '보기',
      '정렬 기준',
      '새로 고침',
      '-',
      '새로 만들기',
    ]);
  });

  // @codocs [[항목 조작:잘라내기와 붙여넣기]]
  it('붙여넣을 것이 없으면 단추 줄이 없고 목록에도 붙여넣기가 없다', () => {
    expect(labels(getDesktopMenuEntries({ ...MENU_OPTIONS, canPaste: false }))).toEqual([
      '보기',
      '정렬 기준',
      '새로 고침',
      '-',
      '새로 만들기',
    ]);
  });

  it('붙여넣기 단추는 툴팁에 Ctrl+V를 보인다', () => {
    expect(getDesktopMenuEntries(MENU_OPTIONS)[0]).toMatchObject({
      kind: 'command-bar',
      buttons: [{ label: '붙여넣기', shortcut: 'Ctrl+V' }],
    });
  });
});
