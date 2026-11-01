import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';

import { getAppMenuEntries } from './app-menu-entries';

/**
 * 메뉴 항목의 이름을 차례로 돌려준다. 구분선은 `-`다.
 * @param entries 메뉴 항목
 * @returns 이름
 */
function toLabels(entries: readonly MenuPopupEntry[]): string[] {
  return entries.map((entry) => ('label' in entry ? entry.label : '-'));
}

/**
 * 이름으로 메뉴 항목을 골라 누른다.
 * @param entries 메뉴 항목
 * @param label 고를 항목 이름
 */
function select(entries: readonly MenuPopupEntry[], label: string): void {
  const entry = entries.find((candidate) => 'label' in candidate && candidate.label === label);
  if (entry === undefined || !('onClick' in entry)) {
    throw new Error(`메뉴 항목이 없다: ${label}`);
  }
  entry.onClick?.();
}

// @codocs [[작업 표시줄:우클릭 메뉴]]
describe('작업 표시줄:우클릭 메뉴', () => {
  const menuOptions = {
    app: 'file-explorer',
    isPinned: true,
    windowCount: 1,
    onAction: vi.fn(),
  } as const;

  it('앱 이름, 고정 해제, 창 닫기 순서로 구분선을 두어 항목을 만든다', () => {
    expect(toLabels(getAppMenuEntries(menuOptions))).toEqual([
      '파일 탐색기',
      '-',
      '작업 표시줄에서 고정 해제',
      '창 닫기',
    ]);
  });

  it('고정 해제 항목은 pin_off 아이콘, 고정 항목은 pin 아이콘을 쓴다', () => {
    const unpin = getAppMenuEntries(menuOptions);
    const pin = getAppMenuEntries({ ...menuOptions, isPinned: false });
    expect(
      unpin.find((entry) => 'label' in entry && entry.label === '작업 표시줄에서 고정 해제'),
    ).toMatchObject({
      icon: 'icons/ic_fluent_pin_off_20_regular.svg',
    });
    expect(
      pin.find((entry) => 'label' in entry && entry.label === '작업 표시줄에 고정'),
    ).toMatchObject({
      icon: 'icons/ic_fluent_pin_20_regular.svg',
    });
  });

  it('앱 이름 줄을 고르면 새 창을 연다', () => {
    const onAction = vi.fn();
    const entries = getAppMenuEntries({ ...menuOptions, app: 'chrome', onAction });
    select(entries, 'Chrome');
    expect(onAction).toHaveBeenCalledWith('open-new');
  });

  it('고정하지 않은 앱은 작업 표시줄에 고정을 보이고, 고르면 고정한다', () => {
    const onAction = vi.fn();
    const entries = getAppMenuEntries({ ...menuOptions, isPinned: false, onAction });
    select(entries, '작업 표시줄에 고정');
    expect(onAction).toHaveBeenCalledWith('pin');
  });

  it('창이 여러 개면 모든 창 닫기로 보인다', () => {
    expect(toLabels(getAppMenuEntries({ ...menuOptions, windowCount: 2 })).at(-1)).toBe(
      '모든 창 닫기',
    );
  });

  it('창이 없으면 창 닫기 항목을 숨긴다', () => {
    expect(toLabels(getAppMenuEntries({ ...menuOptions, app: 'chrome', windowCount: 0 }))).toEqual([
      'Chrome',
      '-',
      '작업 표시줄에서 고정 해제',
    ]);
  });
});
