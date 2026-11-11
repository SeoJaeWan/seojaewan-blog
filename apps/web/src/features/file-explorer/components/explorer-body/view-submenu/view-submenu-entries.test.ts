import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import { DEFAULT_EXPLORER_VIEW } from '@/shared/utils/workspace-rules/workspace-rules';

import { getExplorerViewForShortcut, getViewMenuEntries } from './view-submenu-entries';

const viewOptions = {
  view: DEFAULT_EXPLORER_VIEW,
  isMobile: false,
  onViewChange: vi.fn(),
  onSortByChange: vi.fn(),
  onSortDirectionChange: vi.fn(),
};

/**
 * 라디오 묶음의 선택지 단축키 글자들.
 * @param entries 메뉴 항목
 * @returns 단축키 글자
 */
function radioShortcuts(entries: readonly MenuPopupEntry[]): (string | undefined)[] {
  const group = entries.find((entry) => entry.kind === 'radio-group');
  return group?.options.map((option) => option.shortcut) ?? [];
}

/**
 * 단축키를 누른 키보드 이벤트 값.
 * @param code 누른 자판 자리
 * @returns 키보드 이벤트 값
 */
function ctrlShift(code: string): Parameters<typeof getExplorerViewForShortcut>[0] {
  return { ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, code };
}

// @codocs [[파일 탐색기:보기와 정렬]]
describe('탐색기 보기 메뉴', () => {
  it('보기마다 아이콘과 Ctrl+Shift+2·3·6 단축키 글자가 있다', () => {
    const entries = getViewMenuEntries(viewOptions);
    expect(entries[0]).toMatchObject({
      kind: 'radio-group',
      options: [
        { label: '큰 아이콘', icon: 'icons/ic_fluent_laptop_20_regular.svg' },
        { label: '보통 아이콘', icon: 'icons/ic_fluent_laptop_16_regular.svg' },
        { label: '자세히', icon: 'icons/ic_fluent_line_horizontal_4_20_regular.svg' },
      ],
    });
    expect(radioShortcuts(entries)).toEqual(['Ctrl+Shift+2', 'Ctrl+Shift+3', 'Ctrl+Shift+6']);
  });

  it('모바일은 단축키 글자를 보이지 않는다', () => {
    const entries = getViewMenuEntries({ ...viewOptions, isMobile: true });
    expect(radioShortcuts(entries)).toEqual([undefined, undefined, undefined]);
  });

  it('Ctrl+Shift+2·3·6은 큰 아이콘·보통 아이콘·자세히이고, 다른 키는 보기 단축키가 아니다', () => {
    expect(getExplorerViewForShortcut(ctrlShift('Digit2'))).toBe('large');
    expect(getExplorerViewForShortcut(ctrlShift('Digit3'))).toBe('medium');
    expect(getExplorerViewForShortcut(ctrlShift('Digit6'))).toBe('details');
    expect(getExplorerViewForShortcut(ctrlShift('Digit4'))).toBeUndefined();
    expect(getExplorerViewForShortcut({ ...ctrlShift('Digit2'), altKey: true })).toBeUndefined();
  });
});
