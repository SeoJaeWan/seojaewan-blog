import { describe, expect, it, vi } from 'vitest';

import type { MenuPopupEntry } from '@/shared/components/menu-popup/menu-popup';
import type { WindowApp, WindowState } from '@/shared/utils/window-rules/window-rules';
import { INITIAL_WINDOW_STATE, openWindow } from '@/shared/utils/window-rules/window-rules';

import { getTaskbarAppMenu, getTaskbarApps } from './taskbar-app-rules';

const workArea = { width: 1920, height: 1032 };

/**
 * 앱 창을 차례로 연 창 저장소 상태를 만든다.
 * @param apps 차례로 열 앱
 * @returns 창 저장소 상태
 */
function openApps(apps: readonly WindowApp[]): WindowState {
  let state: WindowState = INITIAL_WINDOW_STATE;
  for (const app of apps) {
    state = openWindow(state, app, workArea).state;
  }
  return state;
}

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

// @codocs [[작업 표시줄:고정과 순서]]
describe('작업 표시줄:고정과 순서', () => {
  it('창이 없으면 고정한 앱만 고정 순서대로 그린다', () => {
    expect(getTaskbarApps(['chrome', 'file-explorer'], INITIAL_WINDOW_STATE)).toEqual([
      'chrome',
      'file-explorer',
    ]);
  });

  it('고정하지 않았지만 창이 열린 앱은 고정한 앱 뒤에 붙인다', () => {
    expect(getTaskbarApps(['chrome'], openApps(['file-explorer']))).toEqual([
      'chrome',
      'file-explorer',
    ]);
  });

  it('고정을 해제한 앱은 창이 열려 있는 동안만 보이고 창을 모두 닫으면 사라진다', () => {
    expect(getTaskbarApps([], openApps(['chrome']))).toEqual(['chrome']);
    expect(getTaskbarApps([], INITIAL_WINDOW_STATE)).toEqual([]);
  });

  it('같은 앱의 창이 여러 개여도 버튼은 하나다', () => {
    expect(getTaskbarApps([], openApps(['chrome', 'chrome']))).toEqual(['chrome']);
  });
});

// @codocs [[작업 표시줄:우클릭 메뉴]]
describe('작업 표시줄:우클릭 메뉴', () => {
  const menuOptions = {
    app: 'file-explorer',
    isPinned: true,
    windowCount: 1,
    onAction: vi.fn(),
  } as const;

  it('앱 이름, 고정 해제, 창 닫기 순서로 구분선을 두어 항목을 만든다', () => {
    expect(toLabels(getTaskbarAppMenu(menuOptions))).toEqual([
      '파일 탐색기',
      '-',
      '작업 표시줄에서 고정 해제',
      '창 닫기',
    ]);
  });

  it('앱 이름 줄을 고르면 새 창을 연다', () => {
    const onAction = vi.fn();
    const entries = getTaskbarAppMenu({ ...menuOptions, app: 'chrome', onAction });
    select(entries, 'Chrome');
    expect(onAction).toHaveBeenCalledWith('open-new');
  });

  it('고정하지 않은 앱은 작업 표시줄에 고정을 보이고, 고르면 고정한다', () => {
    const onAction = vi.fn();
    const entries = getTaskbarAppMenu({ ...menuOptions, isPinned: false, onAction });
    select(entries, '작업 표시줄에 고정');
    expect(onAction).toHaveBeenCalledWith('pin');
  });

  it('창이 여러 개면 모든 창 닫기로 보인다', () => {
    expect(toLabels(getTaskbarAppMenu({ ...menuOptions, windowCount: 2 })).at(-1)).toBe(
      '모든 창 닫기',
    );
  });

  it('창이 없으면 창 닫기 항목을 숨긴다', () => {
    expect(toLabels(getTaskbarAppMenu({ ...menuOptions, app: 'chrome', windowCount: 0 }))).toEqual([
      'Chrome',
      '-',
      '작업 표시줄에서 고정 해제',
    ]);
  });
});
