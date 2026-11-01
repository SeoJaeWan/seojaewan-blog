import { describe, expect, it } from 'vitest';

import type { WindowApp, WindowState } from '@/shared/utils/window-rules/window-rules';
import { INITIAL_WINDOW_STATE, openWindow } from '@/shared/utils/window-rules/window-rules';

import { getTaskbarApps } from './taskbar-app-rules';

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
