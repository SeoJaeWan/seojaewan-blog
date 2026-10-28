// 창을 끌어 옮기고 크기를 조절하는 동안의 자리 계산과 끌어서 스냅할 칸 판정을 React 밖의 순수 함수로 모은다.
// 상태 바꾸기(`setWindowBounds`, `detachWindow`)는 `window-rules.ts`에 있다.

import type {
  SnapZone,
  WindowBounds,
  WindowWorkArea,
} from '@/shared/utils/window-rules/window-rules';
import {
  getSnapZoneRect,
  getVisibleWindowBounds,
  VISIBLE_TITLE_BAR,
} from '@/shared/utils/window-rules/window-rules';

/** 작업 영역 위 한 점(px). 작업 영역 왼쪽 위가 원점이다 */
export type WindowPoint = {
  /** 가로 */
  x: number;
  /** 세로 */
  y: number;
};

/** 크기 조절 핸들의 방향. 가장자리 넷(n·e·s·w)과 모서리 넷이다 */
export type ResizeDirection = 'n' | 'e' | 's' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** 끌어서 놓으면 창이 채울 곳. 스냅 칸이거나 최대화다 */
export type DragSnapTarget = { type: 'zone'; zone: SnapZone } | { type: 'maximize' };

/** 크기(px) */
type WindowSize = {
  /** 너비 */
  width: number;
  /** 높이 */
  height: number;
};

/** 누른 뒤 이만큼(px) 움직여야 끌기를 시작한다. 클릭·더블클릭이 끌기가 되지 않게 한다 */
export const WINDOW_DRAG_THRESHOLD = 4;

/** 포인터가 작업 영역 왼쪽·오른쪽·위쪽 끝에서 이 거리(px) 안이면 끌어서 스냅한다 */
export const SNAP_EDGE_DISTANCE = 8;

/** 끝에 닿은 포인터가 작업 영역 모서리에서 이 거리(px) 안이면 4분의 1 칸으로 스냅한다 */
export const SNAP_CORNER_SIZE = 64;

/**
 * 누른 자리에서 끌기를 시작할 만큼 움직였는지 본다.
 * @param start 누른 자리
 * @param current 지금 포인터 자리
 * @returns 끌기 거리를 넘었는지
 */
export function hasPassedDragThreshold(start: WindowPoint, current: WindowPoint): boolean {
  return (
    Math.abs(current.x - start.x) >= WINDOW_DRAG_THRESHOLD ||
    Math.abs(current.y - start.y) >= WINDOW_DRAG_THRESHOLD
  );
}

/**
 * 창을 옮긴 자리를 구한다. 제목 표시줄 일부(가로 `VISIBLE_TITLE_BAR.width`, 세로 `VISIBLE_TITLE_BAR.height`)는 늘 작업 영역 안에
 * 남고, 제목 표시줄이 작업 영역 위로 나가지 않는다.
 * @codocs [[창 동작:창 조작]]
 * @param start 끌기 시작할 때의 자리
 * @param delta 포인터가 움직인 거리
 * @param workArea 작업 영역 크기
 * @returns 옮긴 자리
 */
export function moveWindowBounds(
  start: WindowBounds,
  delta: WindowPoint,
  workArea: WindowWorkArea,
): WindowBounds {
  return getVisibleWindowBounds({ ...start, x: start.x + delta.x, y: start.y + delta.y }, workArea);
}

/**
 * 가장자리·모서리를 끌어 크기를 조절한 자리를 구한다. 끄는 쪽 가장자리만 움직이고 반대쪽은 그대로다.
 * - 앱별 최소 크기보다 작게 줄이지 않는다. 이미 최소 크기보다 작은 창(작은 화면에 맞춰 줄인 창)은 그 크기까지만 줄인다.
 * - 위쪽 가장자리는 작업 영역 위로 나가지 않고, 제목 표시줄 일부가 늘 작업 영역 안에 남는다.
 * @codocs [[창 동작:창 조작]]
 * @param start 끌기 시작할 때의 자리
 * @param direction 끄는 핸들 방향
 * @param delta 포인터가 움직인 거리
 * @param minSize 앱별 최소 크기
 * @param workArea 작업 영역 크기
 * @returns 크기를 조절한 자리
 */
export function resizeWindowBounds(
  start: WindowBounds,
  direction: ResizeDirection,
  delta: WindowPoint,
  minSize: WindowSize,
  workArea: WindowWorkArea,
): WindowBounds {
  const minWidth = Math.min(minSize.width, start.width);
  const minHeight = Math.min(minSize.height, start.height);
  let left = start.x;
  let top = start.y;
  let right = start.x + start.width;
  let bottom = start.y + start.height;
  if (direction.includes('w')) {
    left = Math.min(left + delta.x, right - minWidth, workArea.width - VISIBLE_TITLE_BAR.width);
  }
  if (direction.includes('e')) {
    right = Math.max(right + delta.x, left + minWidth, VISIBLE_TITLE_BAR.width);
  }
  if (direction.includes('n')) {
    top = Math.min(
      Math.max(top + delta.y, 0),
      bottom - minHeight,
      workArea.height - VISIBLE_TITLE_BAR.height,
    );
  }
  if (direction.includes('s')) {
    bottom = Math.max(bottom + delta.y, top + minHeight);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * 최대화·스냅한 창을 끌어서 뗄 때 떠 있는 창의 자리를 구한다. 크기는 떠 있을 때의 크기로 돌아가고,
 * 누른 포인터가 제목 표시줄에서 차지하던 가로 비율과 위쪽에서의 거리를 지켜 포인터 아래에 놓는다.
 * @codocs [[창 동작:스냅]]
 * @param rect 떼기 전 화면에서 차지하던 자리(최대화면 작업 영역, 스냅이면 그 칸)
 * @param size 떠 있을 때의 크기
 * @param grab 누른 자리
 * @param pointer 지금 포인터 자리
 * @param workArea 작업 영역 크기
 * @returns 뗀 창의 자리
 */
export function getDetachedBounds(
  rect: WindowBounds,
  size: WindowSize,
  grab: WindowPoint,
  pointer: WindowPoint,
  workArea: WindowWorkArea,
): WindowBounds {
  const ratio = rect.width > 0 ? Math.min(Math.max((grab.x - rect.x) / rect.width, 0), 1) : 0;
  return getVisibleWindowBounds(
    {
      x: Math.round(pointer.x - ratio * size.width),
      y: pointer.y - (grab.y - rect.y),
      width: size.width,
      height: size.height,
    },
    workArea,
  );
}

/**
 * 끄는 포인터 자리로 놓았을 때 채울 곳을 정한다. 왼쪽·오른쪽 끝이면 그쪽 절반, 끝의 위·아래 모서리 근처면 그 4분의 1,
 * 위쪽 끝이면 최대화(위쪽 끝의 왼쪽·오른쪽 모서리 근처면 위쪽 4분의 1)다. 포인터가 작업 영역 밖(작업 표시줄 위나 화면 밖)에
 * 있어도 가장 가까운 끝으로 본다.
 * @codocs [[창 동작:스냅]]
 * @param pointer 포인터 자리
 * @param workArea 작업 영역 크기
 * @returns 채울 곳. 끝 근처가 아니면 null
 */
export function getDragSnapTarget(
  pointer: WindowPoint,
  workArea: WindowWorkArea,
): DragSnapTarget | null {
  const isLeft = pointer.x <= SNAP_EDGE_DISTANCE;
  const isRight = pointer.x >= workArea.width - SNAP_EDGE_DISTANCE;
  const isTop = pointer.y <= SNAP_EDGE_DISTANCE;
  const isNearTop = pointer.y <= SNAP_CORNER_SIZE;
  const isNearBottom = pointer.y >= workArea.height - SNAP_CORNER_SIZE;
  if (isLeft || isRight) {
    const column = isLeft ? 0 : 1;
    if (isNearTop) {
      return { type: 'zone', zone: { layout: 'quad', index: column * 2 } };
    }
    if (isNearBottom) {
      return { type: 'zone', zone: { layout: 'quad', index: column * 2 + 1 } };
    }
    return { type: 'zone', zone: { layout: 'half', index: column } };
  }
  if (isTop) {
    if (pointer.x <= SNAP_CORNER_SIZE) {
      return { type: 'zone', zone: { layout: 'quad', index: 0 } };
    }
    if (pointer.x >= workArea.width - SNAP_CORNER_SIZE) {
      return { type: 'zone', zone: { layout: 'quad', index: 2 } };
    }
    return { type: 'maximize' };
  }
  return null;
}

/**
 * 끌어서 스냅할 곳이 작업 영역에서 차지하는 자리를 구한다. 끄는 동안 미리 보여 주는 판(SnapPreview)의 자리다.
 * @codocs [[창 동작:스냅]]
 * @param target 채울 곳
 * @param workArea 작업 영역 크기
 * @returns 자리
 */
export function getDragSnapRect(target: DragSnapTarget, workArea: WindowWorkArea): WindowBounds {
  if (target.type === 'maximize') {
    return { x: 0, y: 0, width: workArea.width, height: workArea.height };
  }
  return getSnapZoneRect(target.zone, workArea);
}

/**
 * 두 스냅할 곳이 같은지 본다. 끄는 동안 바뀔 때만 미리 보기를 다시 그리기 위해 쓴다.
 * @param left 한쪽
 * @param right 다른 쪽
 * @returns 같은지
 */
export function isSameDragSnapTarget(
  left: DragSnapTarget | null,
  right: DragSnapTarget | null,
): boolean {
  if (left === null || right === null || left.type === 'maximize' || right.type === 'maximize') {
    return left?.type === right?.type;
  }
  return left.zone.layout === right.zone.layout && left.zone.index === right.zone.index;
}
