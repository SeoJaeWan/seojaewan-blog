import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useStartMenuStore } from '@/features/start-menu/stores/start-menu-store/start-menu-store';

import { StartMenuLayer } from './start-menu-layer';

// @codocs [[Start 메뉴:열기와 닫기]]
describe('Start 메뉴:열기와 닫기', () => {
  afterEach(() => {
    useStartMenuStore.getState().reset();
  });

  it('앱 항목을 열면 쓰는 곳에 그 앱을 알리고 Start 메뉴를 닫는다', async () => {
    const handleOpenApp = vi.fn();
    useStartMenuStore.getState().toggleStart();
    render(<StartMenuLayer device="desktop" onOpenApp={handleOpenApp} />);
    const startPanel = screen.getByRole('dialog', { name: '시작' });
    await userEvent.click(within(startPanel).getByRole('button', { name: 'File Explorer' }));
    expect(handleOpenApp).toHaveBeenCalledWith('file-explorer');
    expect(screen.queryByRole('dialog', { name: '시작' })).not.toBeInTheDocument();
  });
});
