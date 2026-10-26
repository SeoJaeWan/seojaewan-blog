import { describe, expect, it } from 'vitest';

import {
  closePanels,
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
