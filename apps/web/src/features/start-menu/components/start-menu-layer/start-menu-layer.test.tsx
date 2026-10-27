import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { usePanelStore } from '@/shared/stores/panel-store/panel-store';
import { useWindowStore } from '@/shared/stores/window-store/window-store';
import { useWorkspaceStore } from '@/shared/stores/workspace-store/workspace-store';

import { StartMenuLayer } from './start-menu-layer';

afterEach(() => {
  usePanelStore.getState().reset();
  useWindowStore.getState().reset();
  useWorkspaceStore.setState({ phase: 'idle' });
});

// @codocs [[Start 메뉴:열기와 닫기]]
describe('Start 메뉴:열기와 닫기', () => {
  it('앱 항목을 열면 그 앱 창을 열고 Start 메뉴를 닫는다', async () => {
    usePanelStore.getState().toggleStart();
    render(<StartMenuLayer />);
    const startPanel = screen.getByRole('dialog', { name: '시작' });
    // 고정됨 칸과 모두 목록의 줄에 같은 이름이 있어, DOM 순서가 앞인 고정됨 칸을 누른다
    const [pinnedExplorer] = within(startPanel).getAllByRole('button', { name: 'File Explorer' });
    await userEvent.click(pinnedExplorer ?? document.body);
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['file-explorer']);
    expect(screen.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument();
  });
});

// @codocs [[작업 공간:다시 시작]]
describe('작업 공간:다시 시작', () => {
  it('전원 메뉴의 다시 시작을 고르면 Start 메뉴를 닫고 다시 시작한다', async () => {
    usePanelStore.getState().toggleStart();
    render(<StartMenuLayer />);
    const startPanel = screen.getByRole('dialog', { name: '시작' });
    // jsdom에서는 Base UI 메뉴가 포인터 클릭으로 열리지 않아 키보드로 연다
    within(startPanel).getByRole('button', { name: '전원' }).focus();
    await userEvent.keyboard('{Enter}');
    await userEvent.click(screen.getByRole('menuitem', { name: '다시 시작' }));
    expect(useWorkspaceStore.getState().phase).toBe('covering');
    expect(usePanelStore.getState().openPanel).toBeNull();
  });
});

// @codocs [[Start 메뉴:고정됨]]
describe('Start 메뉴:고정됨', () => {
  it('화면이 낮으면 패널 높이를 작업 영역에서 틈(12)을 뺀 값 이하로 줄인다', () => {
    vi.stubGlobal('innerHeight', 400);
    try {
      usePanelStore.getState().toggleStart();
      render(<StartMenuLayer />);
      // 작업 영역 352(400 - 작업 표시줄 48) - 틈 12
      expect(screen.getByRole('dialog', { name: '시작' }).firstElementChild).toHaveStyle({
        maxHeight: '340px',
      });
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
