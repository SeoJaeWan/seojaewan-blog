import { describe, expect, it } from 'vitest';

import type { WindowState, WindowWorkArea } from './window-rules';
import {
  closeWindow,
  focusWindow,
  getFrontWindowId,
  getTaskbarAppAction,
  getTaskbarAppIndicator,
  INITIAL_WINDOW_STATE,
  minimizeWindow,
  openWindow,
  restoreWindow,
} from './window-rules';

const WORK_AREA = { width: 1920, height: 1032 } as const;

/**
 * 창을 차례로 연 상태를 만든다.
 * @param apps 열 앱들
 * @param workArea 작업 영역
 * @returns 상태와 연 창 id들
 */
function openAll(
  apps: readonly ('file-explorer' | 'chrome')[],
  workArea: WindowWorkArea = WORK_AREA,
): { state: WindowState; ids: string[] } {
  let state: WindowState = INITIAL_WINDOW_STATE;
  const ids: string[] = [];
  for (const app of apps) {
    const result = openWindow(state, app, workArea);
    state = result.state;
    ids.push(result.id);
  }
  return { state, ids };
}

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작', () => {
  it('처음 열 때 화면 가운데에 앱별 기본 크기로 연다', () => {
    const { state, ids } = openAll(['file-explorer']);
    expect(state.windows[ids[0] ?? '']?.bounds).toEqual({
      x: 448,
      y: 196,
      width: 1024,
      height: 640,
    });
  });

  it('새 창은 맨 앞 창보다 오른쪽 아래로 32px씩 비켜 놓는다(계단식)', () => {
    const { state, ids } = openAll(['file-explorer', 'file-explorer']);
    expect(state.windows[ids[1] ?? '']?.bounds).toMatchObject({ x: 480, y: 228 });
  });

  it('비켜 놓은 창이 작업 영역을 벗어나면 가운데로 돌아간다', () => {
    const workArea = { width: 1100, height: 700 };
    const { state, ids } = openAll(['file-explorer', 'file-explorer'], workArea);
    expect(state.windows[ids[1] ?? '']?.bounds).toMatchObject({ x: 38, y: 30 });
  });

  it('작업 영역이 기본 크기보다 작으면 작업 영역에 맞춰 줄인다', () => {
    const { state, ids } = openAll(['chrome'], { width: 1000, height: 600 });
    expect(state.windows[ids[0] ?? '']?.bounds).toEqual({ x: 0, y: 0, width: 1000, height: 600 });
  });

  it('창을 클릭하면 맨 앞으로 온다', () => {
    const { state, ids } = openAll(['file-explorer', 'chrome']);
    expect(getFrontWindowId(focusWindow(state, ids[0] ?? ''))).toBe(ids[0]);
  });

  it('맨 앞 창을 닫으면 남은 창 가운데 가장 최근에 맨 앞이었던 창이 맨 앞으로 온다', () => {
    const { state, ids } = openAll(['file-explorer', 'chrome', 'file-explorer']);
    const [first = '', second = '', third = ''] = ids;
    const focused = focusWindow(state, first);
    // 순서: 2, 3, 1 → 1을 닫으면 3이 앞
    expect(getFrontWindowId(closeWindow(focused, first))).toBe(third);
    expect(closeWindow(focused, first).windows[first]).toBeUndefined();
    expect(getFrontWindowId(closeWindow(closeWindow(focused, first), third))).toBe(second);
  });

  it('남은 창이 없으면 맨 앞 창이 없다(바탕화면만 보인다)', () => {
    const { state, ids } = openAll(['chrome']);
    expect(getFrontWindowId(closeWindow(state, ids[0] ?? ''))).toBeNull();
  });

  it('최소화하면 최소화되지 않은 가장 최근 창이 맨 앞으로 온다', () => {
    const { state, ids } = openAll(['file-explorer', 'chrome']);
    const minimized = minimizeWindow(state, ids[1] ?? '');
    expect(minimized.windows[ids[1] ?? '']?.isMinimized).toBe(true);
    expect(getFrontWindowId(minimized)).toBe(ids[0]);
  });

  it('최소화된 창을 복원하면 맨 앞으로 온다', () => {
    const { state, ids } = openAll(['file-explorer', 'chrome']);
    const restored = restoreWindow(minimizeWindow(state, ids[0] ?? ''), ids[0] ?? '');
    expect(restored.windows[ids[0] ?? '']?.isMinimized).toBe(false);
    expect(getFrontWindowId(restored)).toBe(ids[0]);
  });
});

// @codocs [[작업 표시줄:앱 버튼]]
describe('작업 표시줄:앱 버튼', () => {
  it('열린 창이 없으면 앱을 새로 연다', () => {
    expect(getTaskbarAppAction(INITIAL_WINDOW_STATE, 'chrome')).toEqual({ type: 'open' });
  });

  it('창이 1개이고 맨 앞에 있으면 최소화한다', () => {
    const { state, ids } = openAll(['chrome']);
    expect(getTaskbarAppAction(state, 'chrome')).toEqual({ type: 'minimize', id: ids[0] });
  });

  it('창이 1개이고 뒤에 있으면 복원하고 맨 앞으로 가져온다', () => {
    const { state, ids } = openAll(['chrome', 'file-explorer']);
    expect(getTaskbarAppAction(state, 'chrome')).toEqual({ type: 'restore', id: ids[0] });
  });

  it('창이 1개이고 최소화됐으면 복원하고 맨 앞으로 가져온다', () => {
    const { state, ids } = openAll(['chrome']);
    expect(getTaskbarAppAction(minimizeWindow(state, ids[0] ?? ''), 'chrome')).toEqual({
      type: 'restore',
      id: ids[0],
    });
  });

  it('창이 여러 개면 창 미리보기 목록을 띄운다', () => {
    const { state } = openAll(['chrome', 'chrome']);
    expect(getTaskbarAppAction(state, 'chrome')).toEqual({ type: 'preview' });
  });

  it('열린 창이 있으면 실행 중, 맨 앞 창이 이 앱이면 강조 표시다', () => {
    const { state, ids } = openAll(['chrome', 'file-explorer']);
    expect(getTaskbarAppIndicator(state, 'file-explorer')).toBe('active');
    expect(getTaskbarAppIndicator(state, 'chrome')).toBe('running');
    expect(getTaskbarAppIndicator(minimizeWindow(state, ids[1] ?? ''), 'file-explorer')).toBe(
      'running',
    );
    expect(getTaskbarAppIndicator(INITIAL_WINDOW_STATE, 'chrome')).toBe('none');
  });
});
