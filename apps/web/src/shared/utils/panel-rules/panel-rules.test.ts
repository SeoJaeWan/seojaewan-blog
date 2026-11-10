import { describe, expect, it } from 'vitest';

import {
  closePanels,
  getPanelMaxHeight,
  getPanelMaxWidth,
  getSearchPanelLeft,
  initialPanelState,
  openSearchPanel,
  type PanelState,
  toggleSearchPanel,
  toggleStartPanel,
} from './panel-rules';

const startOpenWithPowerMenu: PanelState = { openPanel: 'start', isPowerMenuOpen: true };

// @codocs [[Start 메뉴:열기와 닫기]]
describe('Start 메뉴:열기와 닫기', () => {
  it('Start 버튼을 누르면 열리고, 다시 누르면 전원 메뉴와 함께 닫힌다', () => {
    expect(toggleStartPanel(initialPanelState).openPanel).toBe('start');
    expect(toggleStartPanel(startOpenWithPowerMenu)).toEqual(closePanels());
  });

  it('검색 패널이 열려 있을 때 Start 버튼을 누르면 검색은 닫히고 Start가 열린다', () => {
    expect(toggleStartPanel({ openPanel: 'search', isPowerMenuOpen: false }).openPanel).toBe(
      'start',
    );
  });
});

// @codocs [[검색:개요]]
describe('검색:개요', () => {
  it('검색칸에 포커스하면 검색 패널이 열리고 Start는 닫힌다', () => {
    expect(openSearchPanel(startOpenWithPowerMenu)).toEqual({
      openPanel: 'search',
      isPowerMenuOpen: false,
    });
  });
});

// @codocs [[작업 표시줄:모바일]]
describe('작업 표시줄:모바일', () => {
  it('좁은 화면의 검색 버튼을 누르면 검색 패널이 열리고, 다시 누르면 닫힌다', () => {
    const opened = toggleSearchPanel(initialPanelState);
    expect(opened.openPanel).toBe('search');
    expect(toggleSearchPanel(opened).openPanel).toBeNull();
  });
});

// @codocs [[Start 메뉴:구성]]
describe('Start 메뉴:구성', () => {
  it('패널은 작업 영역 높이에서 작업 표시줄과의 틈(데스크톱 12)을 뺀 높이를 넘지 않는다', () => {
    expect(getPanelMaxHeight(1032, 'desktop')).toBe(1020);
    expect(getPanelMaxHeight(500, 'desktop')).toBe(488);
  });

  it('모바일 패널은 작업 표시줄 바로 위에 붙어 틈 없이 작업 영역 높이를 넘지 않는다', () => {
    expect(getPanelMaxHeight(500, 'mobile')).toBe(500);
  });

  it('데스크톱 패널은 화면 너비에서 좌우 여백(12씩)을 뺀 너비를 넘지 않는다', () => {
    expect(getPanelMaxWidth(800)).toBe(776);
  });
});

// @codocs [[검색:개요]]
describe('검색:개요 패널 자리', () => {
  it('데스크톱 검색 패널은 왼쪽 끝을 작업 표시줄 검색 상자의 왼쪽 끝에 맞춘다', () => {
    expect(getSearchPanelLeft(500, 832, 1600)).toBe(500);
  });

  it('화면 오른쪽 밖으로 나가면 오른쪽 여백 안쪽으로 민다', () => {
    expect(getSearchPanelLeft(500, 832, 1200)).toBe(356);
  });

  it('화면 왼쪽 밖으로 나가거나 패널이 화면보다 넓으면 왼쪽 여백에 붙인다', () => {
    expect(getSearchPanelLeft(4, 400, 1200)).toBe(12);
    expect(getSearchPanelLeft(300, 776, 780)).toBe(12);
  });
});
