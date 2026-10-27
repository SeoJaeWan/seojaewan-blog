// 창 열기·순서·최소화·복원·닫기 규칙을 React 밖의 순수 함수로 모은다. 저장소(`window-store.ts`)는 이 함수만 부른다.
// 근거는 [[기술 스택:상태 관리]], 위치는 [[저장소 구성:앱 폴더 구조]]이다.

import type { PointerEvent, ReactNode } from 'react';

/** 창을 여는 앱. 작업 표시줄에 고정된 앱(File Explorer, Chrome)이다 */
export type WindowApp = 'file-explorer' | 'chrome';

/** 창 자리(px). 작업 영역 왼쪽 위가 원점이다 */
export type WindowBounds = {
  /** 왼쪽 끝 */
  x: number;
  /** 위쪽 끝 */
  y: number;
  /** 너비 */
  width: number;
  /** 높이 */
  height: number;
};

/** 창 배치. normal은 떠 있는 창, maximized는 작업 영역을 채운 창, snapped는 스냅 칸을 채운 창이다 */
export type WindowPlacement = 'normal' | 'maximized' | 'snapped';

/** 스냅 레이아웃 종류. 반반, 2:1, 반 + 4분의 1 두 칸, 4분할이다(디자인 시스템 `SnapLayoutOption`과 같은 이름) */
export type SnapLayout = 'half' | 'twothirds' | 'halfquarter' | 'quad';

/**
 * 스냅 칸 하나. 칸 번호는 왼쪽 열 위에서 아래, 오른쪽 열 위에서 아래 순서의 0부터다
 * (디자인 시스템 `SnapLayoutOption`의 칸 번호와 같다).
 */
export type SnapZone = {
  /** 레이아웃 */
  layout: SnapLayout;
  /** 칸 번호 */
  index: number;
};

/** 최대화하기 바로 앞의 모습. 이전 크기로 복원하면 이 모습으로 돌아간다 */
export type WindowRestorePoint = {
  /** 배치 */
  placement: Exclude<WindowPlacement, 'maximized'>;
  /** 스냅해 있었으면 그 칸 */
  snapZone: SnapZone | null;
};

/** 열린 창 하나 */
export type OpenWindow = {
  /** 창 id */
  id: string;
  /** 창을 연 앱 */
  app: WindowApp;
  /** 연 차례(1부터). 화면에 그리는 DOM 순서를 고정하는 데 쓴다 */
  serial: number;
  /** 떠 있을 때(placement normal)의 자리. 최대화·스냅해도 지우지 않아 떠 있는 창으로 돌아갈 때 쓴다 */
  bounds: WindowBounds;
  /** 배치 */
  placement: WindowPlacement;
  /** 스냅한 칸. placement가 snapped일 때만 있다 */
  snapZone: SnapZone | null;
  /** 최대화하기 바로 앞의 모습. placement가 maximized일 때만 있다 */
  previous: WindowRestorePoint | null;
  /** 최소화됐는지 */
  isMinimized: boolean;
};

/** 창 저장소의 상태 */
export type WindowState = {
  /** 열린 창. id로 찾는다 */
  windows: Readonly<Record<string, OpenWindow>>;
  /** 활성 순서. 끝이 가장 최근에 맨 앞이었던 창이다. 최소화된 창도 들어 있다 */
  order: readonly string[];
  /** 마지막으로 연 창의 차례 */
  lastSerial: number;
};

/** 작업 영역 크기(px). 화면에서 작업 표시줄을 뺀 곳이다 */
export type WindowWorkArea = {
  /** 너비 */
  width: number;
  /** 높이 */
  height: number;
};

/** 창 층이 앱 창(`ExplorerWindow`, `ChromeWindow`)의 WindowFrame에 넘기는 속성 */
export type WindowFrameControls = {
  /** 맨 앞 창이 아니면 흐리게 그린다 */
  inactive: boolean;
  /** 창 배치. 모바일은 늘 maximized다 */
  placement: WindowPlacement;
  /** 최소화 버튼을 눌렀을 때 */
  onMinimize: () => void;
  /** 닫기 버튼을 눌렀을 때 */
  onClose: () => void;
  /** 최대화 버튼을 눌렀을 때. 늘 최대화인 모바일 창은 없다 */
  onMaximize?: () => void;
  /** 이전 크기로 복원 버튼을 눌렀을 때 */
  onRestore?: () => void;
  /** 제목 표시줄을 더블클릭했을 때(최대화·복원) */
  onTitleBarDoubleClick?: () => void;
  /** 제목 표시줄을 눌렀을 때(창 끌기 시작). 끌 수 없는 모바일 창은 없다 */
  onTitleBarPointerDown?: (event: PointerEvent<HTMLDivElement>) => void;
  /** 최대화 버튼 자리. 마우스를 올리면 스냅 레이아웃을 여는 `SnapLayoutMenu`다 */
  maximizeSlot?: ReactNode;
  /** 창 자리를 채우는 크기 클래스 */
  className: string;
};

/** 열린 창 하나를 그리는 함수. 앱마다 다른 창 조립은 쓰는 곳(shell의 앱 등록표)이 고른다 */
export type RenderWindow = (window: OpenWindow, controls: WindowFrameControls) => ReactNode;

/**
 * 작업 표시줄 앱 버튼을 눌렀을 때 할 일.
 * - `open`: 새 창을 연다
 * - `minimize`: 그 창을 최소화한다
 * - `restore`: 그 창을 복원(최소화돼 있으면)하고 맨 앞으로 가져온다
 * - `preview`: 창 미리보기 목록을 연다
 */
export type TaskbarAppAction =
  | { type: 'open' }
  | { type: 'minimize'; id: string }
  | { type: 'restore'; id: string }
  | { type: 'preview' };

/** 작업 표시줄 앱 버튼 아래 표시. none은 열린 창 없음, running은 실행 중, active는 맨 앞 창이 이 앱 */
export type TaskbarAppIndicator = 'none' | 'running' | 'active';

/** 앱별 기본 크기(px). 피그마 Screens(1920×1080) 기준이다 */
export const DEFAULT_WINDOW_SIZES = {
  'file-explorer': { width: 1024, height: 640 },
  chrome: { width: 1280, height: 800 },
} as const;

/** 앱별 최소 크기(px). 크기 조절로 이보다 작게 줄일 수 없다 */
export const MIN_WINDOW_SIZES = {
  'file-explorer': { width: 500, height: 340 },
  chrome: { width: 500, height: 400 },
} as const;

/** 계단식으로 열 때 새 창을 앞 창보다 오른쪽 아래로 비켜 놓는 거리(px) */
export const WINDOW_CASCADE_OFFSET = 32;

/** 창이 하나도 없는 처음 상태 */
export const INITIAL_WINDOW_STATE = { windows: {}, order: [], lastSerial: 0 } as const;

/**
 * 새 창을 열고 맨 앞으로 둔다. 앱별 기본 크기로 작업 영역 가운데에 놓되, 맨 앞 창이 있으면 그보다 32px씩
 * 오른쪽 아래로 비켜 놓는다(계단식). 비켜 놓은 창이 작업 영역을 벗어나면 가운데로 돌아간다.
 * 작업 영역이 기본 크기보다 작으면 작업 영역에 맞춰 줄인다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param app 열 앱
 * @param workArea 작업 영역 크기
 * @returns 새 상태와 연 창의 id
 */
export function openWindow(
  state: WindowState,
  app: WindowApp,
  workArea: WindowWorkArea,
): { state: WindowState; id: string } {
  const serial = state.lastSerial + 1;
  const id = `window-${String(serial)}`;
  const defaultSize = DEFAULT_WINDOW_SIZES[app];
  const width = Math.min(defaultSize.width, workArea.width);
  const height = Math.min(defaultSize.height, workArea.height);
  const centered = {
    x: Math.round((workArea.width - width) / 2),
    y: Math.round((workArea.height - height) / 2),
  };
  const frontId = getFrontWindowId(state);
  const front = frontId === null ? undefined : state.windows[frontId];
  let position = centered;
  if (front !== undefined) {
    const cascaded = {
      x: front.bounds.x + WINDOW_CASCADE_OFFSET,
      y: front.bounds.y + WINDOW_CASCADE_OFFSET,
    };
    const isInside =
      cascaded.x >= 0 &&
      cascaded.y >= 0 &&
      cascaded.x + width <= workArea.width &&
      cascaded.y + height <= workArea.height;
    position = isInside ? cascaded : centered;
  }
  const opened: OpenWindow = {
    id,
    app,
    serial,
    bounds: { ...position, width, height },
    placement: 'normal',
    snapZone: null,
    previous: null,
    isMinimized: false,
  };
  return {
    id,
    state: {
      windows: { ...state.windows, [id]: opened },
      order: [...state.order, id],
      lastSerial: serial,
    },
  };
}

/**
 * 창을 맨 앞으로 가져온다(창을 클릭했을 때). 최소화된 창이나 이미 맨 앞인 창은 그대로 둔다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @returns 새 상태
 */
export function focusWindow(state: WindowState, id: string): WindowState {
  const target = state.windows[id];
  if (target === undefined || target.isMinimized || state.order.at(-1) === id) {
    return state;
  }
  return { ...state, order: moveToEnd(state.order, id) };
}

/**
 * 창을 바로 지운다. 화면에서 닫히는 애니메이션은 창 층이 따로 남겨 그린다([[피그마 연동:모션 클래스]]).
 * 맨 앞은 남은 창 가운데 최소화되지 않은 가장 최근 창이 된다(`getFrontWindowId`).
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @returns 새 상태
 */
export function closeWindow(state: WindowState, id: string): WindowState {
  if (state.windows[id] === undefined) {
    return state;
  }
  const windows = Object.fromEntries(
    Object.entries(state.windows).filter((entry) => entry[0] !== id),
  );
  return { ...state, windows, order: state.order.filter((windowId) => windowId !== id) };
}

/**
 * 창을 최소화한다. 맨 앞은 남은 창 가운데 최소화되지 않은 가장 최근 창이 된다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @returns 새 상태
 */
export function minimizeWindow(state: WindowState, id: string): WindowState {
  const target = state.windows[id];
  if (target === undefined || target.isMinimized) {
    return state;
  }
  return { ...state, windows: { ...state.windows, [id]: { ...target, isMinimized: true } } };
}

/**
 * 최소화된(또는 뒤에 있는) 창을 복원하고 맨 앞으로 가져온다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @returns 새 상태
 */
export function restoreWindow(state: WindowState, id: string): WindowState {
  const target = state.windows[id];
  if (target === undefined) {
    return state;
  }
  return {
    ...state,
    windows: target.isMinimized
      ? { ...state.windows, [id]: { ...target, isMinimized: false } }
      : state.windows,
    order: moveToEnd(state.order, id),
  };
}

/**
 * 맨 앞 창을 찾는다. 최소화되지 않은 창 가운데 가장 최근에 맨 앞이었던 창이다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @returns 맨 앞 창 id. 보이는 창이 없으면 null
 */
export function getFrontWindowId(state: Pick<WindowState, 'windows' | 'order'>): string | null {
  for (let index = state.order.length - 1; index >= 0; index -= 1) {
    const id = state.order[index];
    if (id !== undefined && state.windows[id]?.isMinimized === false) {
      return id;
    }
  }
  return null;
}

/**
 * 앱의 열린 창을 연 차례대로 고른다.
 * @param state 지금 상태
 * @param app 앱
 * @returns 그 앱의 창들
 */
export function getAppWindows(state: WindowState, app: WindowApp): OpenWindow[] {
  return Object.values(state.windows)
    .filter((item) => item.app === app)
    .sort((left, right) => left.serial - right.serial);
}

/**
 * 작업 표시줄 앱 버튼을 눌렀을 때 할 일을 정한다. 앱 버튼은 앱 단위라 같은 앱의 창이 여러 개여도 버튼은 하나다.
 * - 열린 창이 없으면 새로 연다.
 * - 창이 1개이고 맨 앞이면 최소화한다.
 * - 창이 1개이고 뒤에 있거나 최소화됐으면 복원하고 맨 앞으로 가져온다.
 * - 창이 여러 개면 창 미리보기 목록을 띄운다.
 * @codocs [[작업 표시줄:앱 버튼]]
 * @param state 지금 상태
 * @param app 누른 버튼의 앱
 * @returns 할 일
 */
export function getTaskbarAppAction(state: WindowState, app: WindowApp): TaskbarAppAction {
  const [only, ...rest] = getAppWindows(state, app);
  if (only === undefined) {
    return { type: 'open' };
  }
  if (rest.length > 0) {
    return { type: 'preview' };
  }
  if (getFrontWindowId(state) === only.id) {
    return { type: 'minimize', id: only.id };
  }
  return { type: 'restore', id: only.id };
}

/**
 * 작업 표시줄 앱 버튼 아래 표시를 정한다. 맨 앞 창이 이 앱이면 긴 선(active), 열린 창이 있으면 짧은 점(running)이다.
 * @codocs [[작업 표시줄:앱 버튼]]
 * @param state 지금 상태
 * @param app 버튼의 앱
 * @returns 표시
 */
export function getTaskbarAppIndicator(state: WindowState, app: WindowApp): TaskbarAppIndicator {
  const frontId = getFrontWindowId(state);
  if (frontId !== null && state.windows[frontId]?.app === app) {
    return 'active';
  }
  return getAppWindows(state, app).length > 0 ? 'running' : 'none';
}

/**
 * 창을 최대화한다. 바로 앞 모습(떠 있는 창 또는 스냅 칸)을 기억해 이전 크기로 복원할 때 돌아간다.
 * 이미 최대화한 창은 그대로 둔다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @returns 새 상태
 */
export function maximizeWindow(state: WindowState, id: string): WindowState {
  const target = state.windows[id];
  if (target === undefined || target.placement === 'maximized') {
    return state;
  }
  return replaceWindow(state, {
    ...target,
    placement: 'maximized',
    snapZone: null,
    previous: { placement: target.placement, snapZone: target.snapZone },
  });
}

/**
 * 최대화한 창을 이전 크기로 복원한다. 최대화하기 바로 앞 모습으로 돌아간다. 스냅한 창을 최대화했다면 그 스냅 칸으로 돌아간다.
 * 최대화하지 않은 창은 그대로 둔다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @returns 새 상태
 */
export function restoreFromMaximize(state: WindowState, id: string): WindowState {
  const target = state.windows[id];
  if (target === undefined || target.placement !== 'maximized') {
    return state;
  }
  const restorePoint = target.previous ?? { placement: 'normal', snapZone: null };
  return replaceWindow(state, {
    ...target,
    placement: restorePoint.placement,
    snapZone: restorePoint.snapZone,
    previous: null,
  });
}

/**
 * 최대화한 창은 이전 크기로 복원하고, 아니면 최대화한다(제목 표시줄 더블클릭).
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @returns 새 상태
 */
export function toggleMaximizeWindow(state: WindowState, id: string): WindowState {
  return state.windows[id]?.placement === 'maximized'
    ? restoreFromMaximize(state, id)
    : maximizeWindow(state, id);
}

/**
 * 창을 스냅 칸에 맞춘다. 떠 있을 때의 자리(`bounds`)는 그대로 두어, 나중에 끌어서 떼면 스냅하기 전 크기로 돌아갈 수 있다.
 * Snap Assist에서 고른 창도 이 함수로 칸을 채우므로, 최소화된 창은 복원하고 맨 앞으로 가져온다.
 * @codocs [[창 동작:스냅]]
 * @param state 지금 상태
 * @param id 창 id
 * @param zone 채울 칸
 * @returns 새 상태
 */
export function snapWindow(state: WindowState, id: string, zone: SnapZone): WindowState {
  const target = state.windows[id];
  if (target === undefined) {
    return state;
  }
  return {
    ...replaceWindow(state, {
      ...target,
      placement: 'snapped',
      snapZone: zone,
      previous: null,
      isMinimized: false,
    }),
    order: moveToEnd(state.order, id),
  };
}

// 레이아웃마다 왼쪽 열이 차지하는 너비 비율이다.
const snapLeftColumnRatios = {
  half: 1 / 2,
  twothirds: 2 / 3,
  halfquarter: 1 / 2,
  quad: 1 / 2,
} as const satisfies Record<SnapLayout, number>;

/** 칸 하나의 자리. 열(0 왼쪽, 1 오른쪽), 열 안의 줄(0 위, 1 아래), 열을 나눈 줄 수다 */
type SnapCell = { column: 0 | 1; row: 0 | 1; rows: 1 | 2 };

// 레이아웃마다 칸 번호 순서(왼쪽 열 위에서 아래, 오른쪽 열 위에서 아래)의 칸 자리다.
const snapCells = {
  half: [
    { column: 0, row: 0, rows: 1 },
    { column: 1, row: 0, rows: 1 },
  ],
  twothirds: [
    { column: 0, row: 0, rows: 1 },
    { column: 1, row: 0, rows: 1 },
  ],
  halfquarter: [
    { column: 0, row: 0, rows: 1 },
    { column: 1, row: 0, rows: 2 },
    { column: 1, row: 1, rows: 2 },
  ],
  quad: [
    { column: 0, row: 0, rows: 2 },
    { column: 0, row: 1, rows: 2 },
    { column: 1, row: 0, rows: 2 },
    { column: 1, row: 1, rows: 2 },
  ],
} as const satisfies Record<SnapLayout, readonly SnapCell[]>;

/**
 * 스냅 칸이 작업 영역에서 차지하는 자리를 구한다. 반반, 2:1, 반 + 4분의 1 두 칸, 4분할의 네 레이아웃이다.
 * 칸은 빈틈 없이 작업 영역을 나누고, 나눠 떨어지지 않는 1px은 오른쪽·아래 칸이 갖는다.
 * 없는 칸 번호면 작업 영역 전체를 돌려준다.
 * @codocs [[창 동작:스냅]]
 * @param zone 칸
 * @param workArea 작업 영역 크기
 * @returns 칸 자리
 */
export function getSnapZoneRect(zone: SnapZone, workArea: WindowWorkArea): WindowBounds {
  const cell: SnapCell | undefined = snapCells[zone.layout][zone.index];
  if (cell === undefined) {
    return { x: 0, y: 0, width: workArea.width, height: workArea.height };
  }
  const leftWidth = Math.round(workArea.width * snapLeftColumnRatios[zone.layout]);
  const topHeight = cell.rows === 1 ? workArea.height : Math.round(workArea.height / 2);
  return {
    x: cell.column === 0 ? 0 : leftWidth,
    y: cell.row === 0 ? 0 : topHeight,
    width: cell.column === 0 ? leftWidth : workArea.width - leftWidth,
    height: cell.row === 0 ? topHeight : workArea.height - topHeight,
  };
}

/**
 * 한 칸을 채운 뒤 남은 칸을 칸 번호 순서로 구한다. Snap Assist가 이 차례대로 한 칸씩 제안한다.
 * @codocs [[창 동작:스냅]]
 * @param zone 채운 칸
 * @returns 남은 칸들
 */
export function getRemainingSnapZones(zone: SnapZone): SnapZone[] {
  return snapCells[zone.layout]
    .map((_cell, index) => ({ layout: zone.layout, index }))
    .filter((item) => item.index !== zone.index);
}

/**
 * 창이 지금 화면에서 차지하는 자리를 구한다. 떠 있으면 `bounds`, 최대화면 작업 영역 전체, 스냅이면 그 칸이다.
 * @codocs [[창 동작:스냅]]
 * @param window 창
 * @param workArea 작업 영역 크기
 * @returns 창 자리
 */
export function getWindowRect(window: OpenWindow, workArea: WindowWorkArea): WindowBounds {
  if (window.placement === 'maximized') {
    return { x: 0, y: 0, width: workArea.width, height: workArea.height };
  }
  if (window.placement === 'snapped' && window.snapZone !== null) {
    return getSnapZoneRect(window.snapZone, workArea);
  }
  return window.bounds;
}

/** 최대화·복원·스냅 FLIP의 시작 값. 새 자리에서 이전 자리로 되돌리는 이동(px)과 배율이다 */
export type SnapFlip = {
  /** 가로 이동 */
  x: number;
  /** 세로 이동 */
  y: number;
  /** 가로 배율 */
  scaleX: number;
  /** 세로 배율 */
  scaleY: number;
};

/**
 * 최대화·복원·스냅 모션(`motion-window-snap`)의 시작 값을 구한다(FLIP). 창을 새 자리로 바로 옮긴 뒤 이 값으로 이전 자리·크기에
 * 맞추면, 클래스가 이동 0·배율 1로 되돌린다. 원점이 가운데라 이동은 두 자리의 중심 차이, 배율은 크기 비율이다.
 * @codocs [[피그마 연동:모션 클래스]]
 * @param from 이전 자리
 * @param to 새 자리
 * @returns 시작 이동과 배율
 */
export function getSnapFlip(from: WindowBounds, to: WindowBounds): SnapFlip {
  return {
    x: from.x + from.width / 2 - (to.x + to.width / 2),
    y: from.y + from.height / 2 - (to.y + to.height / 2),
    scaleX: to.width > 0 ? from.width / to.width : 1,
    scaleY: to.height > 0 ? from.height / to.height : 1,
  };
}

/**
 * 창 자리(`bounds`)를 작업 영역 안으로 보정한다. 창이 작업 영역보다 크면 작업 영역에 맞게 줄이고, 그 크기로 창 전체(제목 표시줄 포함)가
 * 작업 영역 안에 들어오도록 가장 가까운 자리로 옮긴다. 이미 안에 있으면 그대로다.
 * @codocs [[창 동작:창 조작]]
 * @param bounds 창 자리
 * @param workArea 작업 영역 크기
 * @returns 보정한 창 자리. 바꿀 것이 없으면 받은 값 그대로
 */
export function fitBoundsToWorkArea(bounds: WindowBounds, workArea: WindowWorkArea): WindowBounds {
  const width = Math.min(bounds.width, workArea.width);
  const height = Math.min(bounds.height, workArea.height);
  const x = Math.min(Math.max(bounds.x, 0), workArea.width - width);
  const y = Math.min(Math.max(bounds.y, 0), workArea.height - height);
  if (x === bounds.x && y === bounds.y && width === bounds.width && height === bounds.height) {
    return bounds;
  }
  return { x, y, width, height };
}

/**
 * 화면 크기가 바뀌어 작업 영역이 달라졌을 때 모든 창의 자리를 작업 영역 안으로 보정한다.
 * 최대화·스냅한 창은 화면에서 차지하는 자리를 작업 영역에서 구하므로 그대로지만, 떠 있을 때의 자리(`bounds`)는 나중에
 * 이전 크기로 복원하거나 스냅에서 뗄 때 쓰므로 함께 보정한다. 보정할 창이 없으면 받은 상태 그대로 돌려준다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param workArea 바뀐 작업 영역 크기
 * @returns 새 상태
 */
export function fitWindowsToWorkArea(state: WindowState, workArea: WindowWorkArea): WindowState {
  const windows: Record<string, OpenWindow> = {};
  let changedCount = 0;
  for (const target of Object.values(state.windows)) {
    const bounds = fitBoundsToWorkArea(target.bounds, workArea);
    if (bounds === target.bounds) {
      windows[target.id] = target;
    } else {
      windows[target.id] = { ...target, bounds };
      changedCount += 1;
    }
  }
  return changedCount > 0 ? { ...state, windows } : state;
}

/**
 * 떠 있는 창의 자리를 바꾼다(끌어서 옮기거나 크기를 조절한 뒤 놓았을 때). 떠 있지 않은 창은 그대로 둔다.
 * @codocs [[창 동작:창 조작]]
 * @param state 지금 상태
 * @param id 창 id
 * @param bounds 새 자리
 * @returns 새 상태
 */
export function setWindowBounds(state: WindowState, id: string, bounds: WindowBounds): WindowState {
  const target = state.windows[id];
  if (target === undefined || target.placement !== 'normal') {
    return state;
  }
  return replaceWindow(state, { ...target, bounds });
}

/**
 * 최대화·스냅한 창을 끌어서 떼어 떠 있는 창으로 돌린다. 크기는 떠 있을 때의 크기이고 자리는 끄는 포인터 아래다.
 * 최대화하기 앞 모습은 지운다. 이미 떠 있는 창은 그대로 둔다.
 * @codocs [[창 동작:스냅]]
 * @param state 지금 상태
 * @param id 창 id
 * @param bounds 뗀 창의 자리
 * @returns 새 상태
 */
export function detachWindow(state: WindowState, id: string, bounds: WindowBounds): WindowState {
  const target = state.windows[id];
  if (target === undefined || target.placement === 'normal') {
    return state;
  }
  return replaceWindow(state, {
    ...target,
    placement: 'normal',
    snapZone: null,
    previous: null,
    bounds,
  });
}

/**
 * 창 하나를 바꾼 상태를 만든다.
 * @param state 지금 상태
 * @param window 바꾼 창
 * @returns 새 상태
 */
function replaceWindow(state: WindowState, window: OpenWindow): WindowState {
  return { ...state, windows: { ...state.windows, [window.id]: window } };
}

/**
 * 목록에서 값을 빼서 끝에 다시 넣는다.
 * @param order 활성 순서
 * @param id 끝으로 옮길 id
 * @returns 새 순서
 */
function moveToEnd(order: readonly string[], id: string): string[] {
  return [...order.filter((windowId) => windowId !== id), id];
}
