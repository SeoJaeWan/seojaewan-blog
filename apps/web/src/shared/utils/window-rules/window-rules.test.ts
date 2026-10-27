import { describe, expect, it } from 'vitest';

import type { OpenWindow, WindowState, WindowWorkArea } from './window-rules';
import {
  closeWindow,
  focusWindow,
  getFrontWindowId,
  getRemainingSnapZones,
  getSnapFlip,
  getSnapZoneRect,
  getTaskbarAppAction,
  getTaskbarAppIndicator,
  getWindowRect,
  INITIAL_WINDOW_STATE,
  maximizeWindow,
  minimizeWindow,
  openWindow,
  restoreFromMaximize,
  restoreWindow,
  snapWindow,
  toggleMaximizeWindow,
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

/**
 * 상태에서 창 하나를 꺼낸다. 없으면 시험을 실패시킨다.
 * @param state 상태
 * @param id 창 id
 * @returns 창
 */
function getWindow(state: WindowState, id: string): OpenWindow {
  const target = state.windows[id];
  if (target === undefined) {
    throw new Error(`창 ${id}가 없다`);
  }
  return target;
}

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 (최대화)', () => {
  it('최대화하면 작업 영역을 채우고, 이전 크기로 복원하면 원래 크기와 위치로 돌아간다', () => {
    const { state, ids } = openAll(['file-explorer']);
    const id = ids[0] ?? '';
    const before = state.windows[id];
    const maximized = maximizeWindow(state, id);
    expect(maximized.windows[id]?.placement).toBe('maximized');
    expect(getWindowRect(getWindow(maximized, id), WORK_AREA)).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1032,
    });
    const restored = restoreFromMaximize(maximized, id);
    expect(restored.windows[id]).toEqual(before);
  });

  it('제목 표시줄 더블클릭은 최대화와 복원을 번갈아 한다', () => {
    const { state, ids } = openAll(['chrome']);
    const id = ids[0] ?? '';
    const once = toggleMaximizeWindow(state, id);
    expect(once.windows[id]?.placement).toBe('maximized');
    expect(toggleMaximizeWindow(once, id).windows[id]?.placement).toBe('normal');
  });

  it('스냅한 창을 최대화했다가 복원하면 바로 앞 모습(스냅 칸)으로 돌아간다', () => {
    const { state, ids } = openAll(['chrome']);
    const id = ids[0] ?? '';
    const zone = { layout: 'half', index: 1 } as const;
    const restored = restoreFromMaximize(maximizeWindow(snapWindow(state, id, zone), id), id);
    expect(restored.windows[id]).toMatchObject({ placement: 'snapped', snapZone: zone });
  });
});

// @codocs [[창 동작:스냅]]
describe('창 동작:스냅', () => {
  const area = { width: 1920, height: 1032 };

  it('반반은 작업 영역을 좌우 절반으로 나눈다', () => {
    expect(getSnapZoneRect({ layout: 'half', index: 0 }, area)).toEqual({
      x: 0,
      y: 0,
      width: 960,
      height: 1032,
    });
    expect(getSnapZoneRect({ layout: 'half', index: 1 }, area)).toEqual({
      x: 960,
      y: 0,
      width: 960,
      height: 1032,
    });
  });

  it('2:1은 왼쪽 3분의 2와 오른쪽 3분의 1이다', () => {
    expect(getSnapZoneRect({ layout: 'twothirds', index: 0 }, area)).toMatchObject({
      x: 0,
      width: 1280,
    });
    expect(getSnapZoneRect({ layout: 'twothirds', index: 1 }, area)).toMatchObject({
      x: 1280,
      width: 640,
    });
  });

  it('반 + 4분의 1 두 칸은 왼쪽 절반과 오른쪽 위·아래다', () => {
    expect(getSnapZoneRect({ layout: 'halfquarter', index: 0 }, area)).toEqual({
      x: 0,
      y: 0,
      width: 960,
      height: 1032,
    });
    expect(getSnapZoneRect({ layout: 'halfquarter', index: 1 }, area)).toEqual({
      x: 960,
      y: 0,
      width: 960,
      height: 516,
    });
    expect(getSnapZoneRect({ layout: 'halfquarter', index: 2 }, area)).toEqual({
      x: 960,
      y: 516,
      width: 960,
      height: 516,
    });
  });

  it('4분할은 왼쪽 위·아래, 오른쪽 위·아래 순서이고, 나눠 떨어지지 않는 1px은 오른쪽·아래 칸이 갖는다', () => {
    const odd = { width: 1001, height: 701 };
    const rects = [0, 1, 2, 3].map((index) => getSnapZoneRect({ layout: 'quad', index }, odd));
    expect(rects).toEqual([
      { x: 0, y: 0, width: 501, height: 351 },
      { x: 0, y: 351, width: 501, height: 350 },
      { x: 501, y: 0, width: 500, height: 351 },
      { x: 501, y: 351, width: 500, height: 350 },
    ]);
  });

  it('칸을 채우면 남은 칸을 칸 번호 순서로 제안한다', () => {
    expect(getRemainingSnapZones({ layout: 'quad', index: 1 }).map((zone) => zone.index)).toEqual([
      0, 2, 3,
    ]);
    expect(getRemainingSnapZones({ layout: 'half', index: 0 })).toEqual([
      { layout: 'half', index: 1 },
    ]);
  });

  it('스냅하면 칸을 채우고 맨 앞으로 오며, 떠 있을 때의 자리는 지킨다', () => {
    const { state, ids } = openAll(['chrome', 'file-explorer']);
    const id = ids[0] ?? '';
    const snapped = snapWindow(minimizeWindow(state, id), id, { layout: 'half', index: 0 });
    expect(snapped.windows[id]).toMatchObject({
      placement: 'snapped',
      isMinimized: false,
      bounds: state.windows[id]?.bounds,
    });
    expect(getFrontWindowId(snapped)).toBe(id);
    expect(getWindowRect(getWindow(snapped, id), area)).toEqual(
      getSnapZoneRect({ layout: 'half', index: 0 }, area),
    );
  });
});

// @codocs [[피그마 연동:모션 클래스]]
describe('디자인 기반:모션 클래스 (FLIP)', () => {
  it('시작 이동은 원점(가운데) 기준 두 자리의 중심 차이, 시작 배율은 크기 비율이다', () => {
    const from = { x: 448, y: 196, width: 1024, height: 640 };
    const to = { x: 0, y: 0, width: 1920, height: 1032 };
    expect(getSnapFlip(from, to)).toEqual({
      x: 960 - 960,
      y: 516 - 516,
      scaleX: 1024 / 1920,
      scaleY: 640 / 1032,
    });
    expect(getSnapFlip(to, { x: 960, y: 0, width: 960, height: 1032 })).toEqual({
      x: 960 - 1440,
      y: 0,
      scaleX: 2,
      scaleY: 1,
    });
  });
});
