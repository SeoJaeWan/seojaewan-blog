/** 열린 패널. Start 메뉴(start)와 검색 패널(search) 중 하나만 열린다 */
export type OpenPanel = 'start' | 'search' | null;

/** Start·검색 패널과 전원 메뉴의 열림 상태 */
export type StartMenuState = {
  /** 열린 패널. 없으면 null이다 */
  openPanel: OpenPanel;
  /** Start 아래 줄의 전원 메뉴가 열렸는지 */
  isPowerMenuOpen: boolean;
};

/** 처음 상태. 패널과 전원 메뉴가 모두 닫혀 있다 */
export const initialStartMenuState: StartMenuState = {
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
export function toggleStartPanel(state: StartMenuState): StartMenuState {
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
export function openSearchPanel(state: StartMenuState): StartMenuState {
  return state.openPanel === 'search' ? state : { openPanel: 'search', isPowerMenuOpen: false };
}

/**
 * 좁은 화면의 검색 버튼을 눌렀을 때의 상태. 검색 패널이 열려 있으면 닫고, 아니면 연다.
 * @codocs [[모바일:차이]]
 * @param state 지금 상태
 * @returns 바뀐 상태
 */
export function toggleSearchPanel(state: StartMenuState): StartMenuState {
  return state.openPanel === 'search' ? closePanels() : openSearchPanel(state);
}

/**
 * 패널을 닫은 상태(Esc, 바깥 클릭, 항목 열기). 패널 안의 전원 메뉴도 함께 닫는다.
 * @codocs [[Start 메뉴:열기와 닫기]]
 * @codocs [[검색:결과 화면]]
 * @returns 닫힌 상태
 */
export function closePanels(): StartMenuState {
  return initialStartMenuState;
}
