/** 열린 패널. Start 메뉴(start)와 검색 패널(search) 중 하나만 열린다 */
export type OpenPanel = 'start' | 'search' | null;

/** Start·검색 패널과 전원 메뉴의 열림 상태 */
export type PanelState = {
  /** 열린 패널. 없으면 null이다 */
  openPanel: OpenPanel;
  /** Start 아래 줄의 전원 메뉴가 열렸는지 */
  isPowerMenuOpen: boolean;
};

/** 처음 상태. 패널과 전원 메뉴가 모두 닫혀 있다 */
export const initialPanelState: PanelState = {
  openPanel: null,
  isPowerMenuOpen: false,
};

/**
 * Start 버튼을 눌렀을 때의 상태. Start가 열려 있으면 닫고, 아니면(검색이 열려 있어도) Start를 연다.
 * 두 패널은 함께 열리지 않으므로 검색은 닫힌다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function toggleStartPanel(state: PanelState): PanelState {
  return state.openPanel === 'start'
    ? closePanels()
    : { openPanel: 'start', isPowerMenuOpen: false };
}

/**
 * 작업 표시줄 검색칸에 포커스했을 때의 상태. 검색 패널을 연다. Start가 열려 있었으면 닫힌다.
 * @codocs [[검색:개요]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function openSearchPanel(state: PanelState): PanelState {
  return state.openPanel === 'search' ? state : { openPanel: 'search', isPowerMenuOpen: false };
}

/**
 * 좁은 화면의 검색 버튼을 눌렀을 때의 상태. 검색 패널이 열려 있으면 닫고, 아니면 연다.
 * @codocs [[모바일:차이]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function toggleSearchPanel(state: PanelState): PanelState {
  return state.openPanel === 'search' ? closePanels() : openSearchPanel(state);
}

/**
 * 패널을 닫은 상태(Esc, 바깥 클릭, 항목 열기). 패널 안의 전원 메뉴도 함께 닫는다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[검색:결과 화면]]
 * @returns 닫힌 상태
 */
export function closePanels(): PanelState {
  return initialPanelState;
}

/** 데스크톱 패널과 작업 표시줄 사이의 틈(px). 모바일 패널은 작업 표시줄 바로 위에 붙어 틈이 없다 */
export const PANEL_GAP = 12;

/**
 * Start·검색 패널이 가질 수 있는 가장 큰 높이를 구한다. 작업 영역 높이에서 패널과 작업 표시줄 사이의 틈을 뺀 값이라,
 * 화면이 낮아도 패널 위쪽이 잘리지 않는다. 패널의 원래 높이(데스크톱 720, 모바일 640)보다 작을 때만 줄어든다.
 * @codocs [[Start 메뉴:고정됨]]
 * @codocs [[모바일:차이]]
 * @param workAreaHeight 작업 영역 높이(화면에서 작업 표시줄을 뺀 곳)
 * @param device 화면 방식
 * @returns 패널의 최대 높이(px)
 */
export function getPanelMaxHeight(workAreaHeight: number, device: 'desktop' | 'mobile'): number {
  const gap = device === 'desktop' ? PANEL_GAP : 0;
  return Math.max(0, workAreaHeight - gap);
}
