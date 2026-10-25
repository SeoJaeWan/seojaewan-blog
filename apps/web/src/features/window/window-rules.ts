// 창 열기·순서·최소화·복원·닫기 규칙을 React 밖의 순수 함수로 모은다. 저장소(`window-store.ts`)는 이 함수만 부른다.
// 근거는 [[기술 스택:상태 관리]], 위치는 [[저장소 구성:앱 폴더 구조]]이다.

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

/** 창 배치. 최대화·스냅은 다음 단계에서 붙인다 */
export type WindowPlacement = 'normal' | 'maximized' | 'snapped';

/** 열린 창 하나 */
export type OpenWindow = {
  /** 창 id */
  id: string;
  /** 창을 연 앱 */
  app: WindowApp;
  /** 연 차례(1부터). 화면에 그리는 DOM 순서를 고정하는 데 쓴다 */
  serial: number;
  /** 떠 있을 때의 자리 */
  bounds: WindowBounds;
  /** 배치 */
  placement: WindowPlacement;
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
 * 창을 바로 지운다. 화면에서 닫히는 애니메이션은 창 층이 따로 남겨 그린다([[디자인 기반:모션 클래스]]).
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
 * 목록에서 값을 빼서 끝에 다시 넣는다.
 * @param order 활성 순서
 * @param id 끝으로 옮길 id
 * @returns 새 순서
 */
function moveToEnd(order: readonly string[], id: string): string[] {
  return [...order.filter((windowId) => windowId !== id), id];
}
