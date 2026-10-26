import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

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
    await userEvent.click(within(startPanel).getByRole('button', { name: 'File Explorer' }));
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
