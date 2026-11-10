import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getDesktopIconSizeForShortcut, getDesktopViewMenuEntries } from './view-submenu-entries';

const VIEW_OPTIONS = {
  iconSize: 'medium',
  isAutoArrange: true,
  isAutoArrangeLocked: false,
  isMobile: false,
  onIconSizeChange: vi.fn(),
  onAutoArrangeChange: vi.fn(),
} as const;

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
function ctrlShift(code: string): Parameters<typeof getDesktopIconSizeForShortcut>[0] {
  return { ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, code };
}

// @codocs [[바탕화면 우클릭 메뉴:빈 곳]]
// @codocs [[항목 조작:단축키]]
describe('바탕화면 보기 하위 메뉴', () => {
  it('아이콘 크기마다 아이콘과 Ctrl+Shift+2·3·4 단축키 글자가 있고, 자동 정렬에도 아이콘이 있다', () => {
    const entries = getDesktopViewMenuEntries(VIEW_OPTIONS);
    expect(entries[0]).toMatchObject({
      kind: 'radio-group',
      options: [
        { label: '큰 아이콘', icon: 'icons/ic_fluent_laptop_20_regular.svg' },
        { label: '보통 아이콘', icon: 'icons/ic_fluent_laptop_16_regular.svg' },
        { label: '작은 아이콘', icon: 'icons/ic_fluent_grid_20_regular.svg' },
      ],
    });
    expect(radioShortcuts(entries)).toEqual(['Ctrl+Shift+2', 'Ctrl+Shift+3', 'Ctrl+Shift+4']);
    expect(entries[2]).toMatchObject({
      label: '아이콘 자동 정렬',
      icon: 'illustrations/icon-color-auto-arrange.svg',
    });
  });

  it('모바일은 단축키 글자를 보이지 않는다', () => {
    const entries = getDesktopViewMenuEntries({ ...VIEW_OPTIONS, isMobile: true });
    expect(radioShortcuts(entries)).toEqual([undefined, undefined, undefined]);
  });

  it('Ctrl+Shift+2·3·4는 큰·보통·작은 아이콘이고, 다른 키는 보기 단축키가 아니다', () => {
    expect(getDesktopIconSizeForShortcut(ctrlShift('Digit2'))).toBe('large');
    expect(getDesktopIconSizeForShortcut(ctrlShift('Digit3'))).toBe('medium');
    expect(getDesktopIconSizeForShortcut(ctrlShift('Digit4'))).toBe('small');
    expect(getDesktopIconSizeForShortcut(ctrlShift('Digit6'))).toBeUndefined();
    expect(
      getDesktopIconSizeForShortcut({ ...ctrlShift('Digit2'), shiftKey: false }),
    ).toBeUndefined();
  });
});
