import { describe, expect, it } from 'vitest';

import {
  closePanels,
  getPanelMaxHeight,
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

// @codocs [[모바일:차이]]
describe('모바일:차이', () => {
  it('좁은 화면의 검색 버튼을 누르면 검색 패널이 열리고, 다시 누르면 닫힌다', () => {
    const opened = toggleSearchPanel(initialPanelState);
    expect(opened.openPanel).toBe('search');
    expect(toggleSearchPanel(opened).openPanel).toBeNull();
  });
});

// @codocs [[Start 메뉴:구성]]
describe('Start 메뉴:구성', () => {
  it('패널은 작업 영역 높이에서 작업 표시줄과의 틈(데스크톱 12)을 뺀 높이를 넘지 않는다', () => {
    expect(getPanelMaxHeight(1032, 'desktop', 'start')).toBe(1020);
    expect(getPanelMaxHeight(500, 'desktop', 'start')).toBe(488);
  });

  it('모바일 패널은 작업 표시줄 바로 위에 붙어 틈 없이 작업 영역 높이를 넘지 않는다', () => {
    expect(getPanelMaxHeight(500, 'mobile', 'start')).toBe(500);
  });

  it('Start 패널은 위쪽(검색칸)과 아래쪽(프로필·전원 줄)을 더한 높이보다 작아지지 않는다', () => {
    expect(getPanelMaxHeight(100, 'desktop', 'start')).toBe(151);
    expect(getPanelMaxHeight(8, 'mobile', 'start')).toBe(151);
  });

  it('검색 패널도 같은 규칙이라 위아래 여백(모바일은 검색칸까지)보다 작아지지 않는다', () => {
    expect(getPanelMaxHeight(500, 'desktop', 'search')).toBe(488);
    expect(getPanelMaxHeight(8, 'desktop', 'search')).toBe(66);
    expect(getPanelMaxHeight(8, 'mobile', 'search')).toBe(118);
  });
});
