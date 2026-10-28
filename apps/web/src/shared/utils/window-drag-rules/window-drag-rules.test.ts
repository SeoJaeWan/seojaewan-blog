import { describe, expect, it } from 'vitest';

import { MIN_WINDOW_SIZES, VISIBLE_TITLE_BAR } from '@/shared/utils/window-rules/window-rules';

import {
  getDetachedBounds,
  getDragSnapRect,
  getDragSnapTarget,
  hasPassedDragThreshold,
  isSameDragSnapTarget,
  moveWindowBounds,
  resizeWindowBounds,
  SNAP_CORNER_SIZE,
  SNAP_EDGE_DISTANCE,
} from './window-drag-rules';

const WORK_AREA = { width: 1920, height: 1032 } as const;
const BOUNDS = { x: 448, y: 196, width: 1024, height: 640 } as const;
const explorerMin = MIN_WINDOW_SIZES['file-explorer'];

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 - 이동', () => {
  it('누른 자리에서 끌기 거리 이상 움직여야 끌기를 시작한다', () => {
    expect(hasPassedDragThreshold({ x: 10, y: 10 }, { x: 13, y: 12 })).toBe(false);
    expect(hasPassedDragThreshold({ x: 10, y: 10 }, { x: 14, y: 10 })).toBe(true);
    expect(hasPassedDragThreshold({ x: 10, y: 10 }, { x: 10, y: 6 })).toBe(true);
  });

  it('포인터가 움직인 만큼 창을 옮긴다', () => {
    expect(moveWindowBounds(BOUNDS, { x: -100, y: 50 }, WORK_AREA)).toEqual({
      ...BOUNDS,
      x: 348,
      y: 246,
    });
  });

  it('화면 밖으로 끌어도 제목 표시줄 일부는 작업 영역 안에 남는다', () => {
    expect(moveWindowBounds(BOUNDS, { x: -5000, y: 5000 }, WORK_AREA)).toEqual({
      ...BOUNDS,
      x: VISIBLE_TITLE_BAR.width - BOUNDS.width,
      y: WORK_AREA.height - VISIBLE_TITLE_BAR.height,
    });
    expect(moveWindowBounds(BOUNDS, { x: 5000, y: 0 }, WORK_AREA).x).toBe(
      WORK_AREA.width - VISIBLE_TITLE_BAR.width,
    );
  });

  it('제목 표시줄은 작업 영역 위로 나가지 않는다', () => {
    expect(moveWindowBounds(BOUNDS, { x: 0, y: -500 }, WORK_AREA).y).toBe(0);
  });
});

// @codocs [[창 동작:창 조작]]
describe('창 동작:창 조작 - 크기 조절', () => {
  it('오른쪽 아래 모서리를 끌면 왼쪽 위는 그대로 두고 크기를 바꾼다', () => {
    expect(resizeWindowBounds(BOUNDS, 'se', { x: 100, y: -40 }, explorerMin, WORK_AREA)).toEqual({
      x: 448,
      y: 196,
      width: 1124,
      height: 600,
    });
  });

  it('왼쪽 위 모서리를 끌면 오른쪽 아래는 그대로 두고 크기를 바꾼다', () => {
    expect(resizeWindowBounds(BOUNDS, 'nw', { x: -48, y: -96 }, explorerMin, WORK_AREA)).toEqual({
      x: 400,
      y: 100,
      width: 1072,
      height: 736,
    });
  });

  it('가장자리는 그 방향으로만 크기를 바꾼다', () => {
    expect(resizeWindowBounds(BOUNDS, 'e', { x: 30, y: 30 }, explorerMin, WORK_AREA)).toEqual({
      ...BOUNDS,
      width: 1054,
    });
    expect(resizeWindowBounds(BOUNDS, 'n', { x: 30, y: 30 }, explorerMin, WORK_AREA)).toEqual({
      ...BOUNDS,
      y: 226,
      height: 610,
    });
  });

  it('앱별 최소 크기보다 작게 줄이지 않는다', () => {
    expect(resizeWindowBounds(BOUNDS, 'nw', { x: 900, y: 900 }, explorerMin, WORK_AREA)).toEqual({
      x: BOUNDS.x + BOUNDS.width - explorerMin.width,
      y: BOUNDS.y + BOUNDS.height - explorerMin.height,
      width: explorerMin.width,
      height: explorerMin.height,
    });
    expect(
      resizeWindowBounds(BOUNDS, 'se', { x: -900, y: -900 }, MIN_WINDOW_SIZES.chrome, WORK_AREA),
    ).toMatchObject({ width: 500, height: 400 });
  });

  it('이미 최소 크기보다 작은 창은 그 크기까지만 줄인다', () => {
    const small = { x: 0, y: 0, width: 400, height: 300 };
    expect(resizeWindowBounds(small, 'se', { x: -100, y: -100 }, explorerMin, WORK_AREA)).toEqual(
      small,
    );
  });

  it('위쪽 가장자리는 작업 영역 위로 나가지 않는다', () => {
    expect(resizeWindowBounds(BOUNDS, 'n', { x: 0, y: -500 }, explorerMin, WORK_AREA)).toEqual({
      ...BOUNDS,
      y: 0,
      height: BOUNDS.y + BOUNDS.height,
    });
  });

  it('크기를 조절해도 제목 표시줄 일부는 작업 영역 안에 남는다', () => {
    const leftOut = { x: -800, y: 100, width: 1024, height: 640 };
    expect(
      resizeWindowBounds(leftOut, 'e', { x: -400, y: 0 }, explorerMin, WORK_AREA),
    ).toMatchObject({ x: -800, width: 1000 });
    const rightOut = { x: 1700, y: 100, width: 1024, height: 640 };
    expect(
      resizeWindowBounds(rightOut, 'w', { x: 300, y: 0 }, explorerMin, WORK_AREA),
    ).toMatchObject({ x: WORK_AREA.width - VISIBLE_TITLE_BAR.width });
  });
});

// @codocs [[창 동작:스냅]]
describe('창 동작:스냅 - 끌어서 스냅', () => {
  it('왼쪽·오른쪽 끝으로 끌면 그쪽 절반이다', () => {
    expect(getDragSnapTarget({ x: 0, y: 500 }, WORK_AREA)).toEqual({
      type: 'zone',
      zone: { layout: 'half', index: 0 },
    });
    expect(getDragSnapTarget({ x: WORK_AREA.width - 1, y: 500 }, WORK_AREA)).toEqual({
      type: 'zone',
      zone: { layout: 'half', index: 1 },
    });
  });

  it('모서리로 끌면 그 4분의 1이다', () => {
    expect(getDragSnapTarget({ x: 0, y: SNAP_CORNER_SIZE }, WORK_AREA)).toEqual({
      type: 'zone',
      zone: { layout: 'quad', index: 0 },
    });
    expect(getDragSnapTarget({ x: -20, y: WORK_AREA.height + 10 }, WORK_AREA)).toEqual({
      type: 'zone',
      zone: { layout: 'quad', index: 1 },
    });
    expect(getDragSnapTarget({ x: WORK_AREA.width - 1, y: 0 }, WORK_AREA)).toEqual({
      type: 'zone',
      zone: { layout: 'quad', index: 2 },
    });
    expect(getDragSnapTarget({ x: WORK_AREA.width, y: WORK_AREA.height - 1 }, WORK_AREA)).toEqual({
      type: 'zone',
      zone: { layout: 'quad', index: 3 },
    });
    expect(getDragSnapTarget({ x: 30, y: 0 }, WORK_AREA)).toEqual({
      type: 'zone',
      zone: { layout: 'quad', index: 0 },
    });
  });

  it('위쪽 끝으로 끌면 최대화다', () => {
    expect(getDragSnapTarget({ x: 900, y: SNAP_EDGE_DISTANCE }, WORK_AREA)).toEqual({
      type: 'maximize',
    });
  });

  it('끝 근처가 아니면 스냅하지 않는다', () => {
    expect(getDragSnapTarget({ x: SNAP_EDGE_DISTANCE + 1, y: 500 }, WORK_AREA)).toBeNull();
  });

  it('미리 보기 판은 채울 칸 또는 작업 영역 전체 자리에 놓는다', () => {
    expect(getDragSnapRect({ type: 'maximize' }, WORK_AREA)).toEqual({
      x: 0,
      y: 0,
      ...WORK_AREA,
    });
    expect(
      getDragSnapRect({ type: 'zone', zone: { layout: 'half', index: 1 } }, WORK_AREA),
    ).toEqual({ x: 960, y: 0, width: 960, height: 1032 });
  });

  it('스냅할 곳이 같은지 비교한다', () => {
    const left = { type: 'zone', zone: { layout: 'half', index: 0 } } as const;
    expect(isSameDragSnapTarget(left, { type: 'zone', zone: { layout: 'half', index: 0 } })).toBe(
      true,
    );
    expect(isSameDragSnapTarget(left, { type: 'maximize' })).toBe(false);
    expect(isSameDragSnapTarget(null, null)).toBe(true);
    expect(isSameDragSnapTarget(null, { type: 'maximize' })).toBe(false);
  });
});

// @codocs [[창 동작:스냅]]
describe('창 동작:스냅 - 스냅된 창을 끌어서 떼기', () => {
  it('떠 있을 때 크기로 돌아가며, 누른 자리의 가로 비율을 지켜 포인터 아래에 놓는다', () => {
    const maximized = { x: 0, y: 0, ...WORK_AREA };
    // 작업 영역 너비의 1/4 지점을 눌렀으므로 떼어진 창도 너비의 1/4 지점이 포인터 아래에 온다
    expect(
      getDetachedBounds(
        maximized,
        { width: 1024, height: 640 },
        { x: 480, y: 12 },
        { x: 500, y: 40 },
        WORK_AREA,
      ),
    ).toEqual({ x: 244, y: 28, width: 1024, height: 640 });
  });

  it('뗀 자리도 제목 표시줄 일부가 작업 영역 안에 남는다', () => {
    const snapped = { x: 960, y: 0, width: 960, height: 1032 };
    expect(
      getDetachedBounds(
        snapped,
        { width: 1024, height: 640 },
        { x: 1919, y: 10 },
        { x: 1915, y: 2000 },
        WORK_AREA,
      ),
    ).toMatchObject({ y: WORK_AREA.height - VISIBLE_TITLE_BAR.height });
  });
});
