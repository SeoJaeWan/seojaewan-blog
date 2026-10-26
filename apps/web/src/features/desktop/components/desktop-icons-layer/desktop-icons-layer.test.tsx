import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import { useWindowStore } from '@/shared/stores/window-store/window-store';

import { DesktopIconsLayer } from './desktop-icons-layer';

afterEach(() => {
  useWindowStore.getState().reset();
});

// @codocs [[창 동작:열기 규칙]]
describe('창 동작:열기 규칙', () => {
  it('Blog 폴더 아이콘을 더블클릭하면 새 탐색기 창을 연다', async () => {
    render(<DesktopIconsLayer />);
    await userEvent.dblClick(screen.getByText('Blog'));
    const { windows, order } = useWindowStore.getState();
    expect(order.map((id) => windows[id]?.app)).toEqual(['file-explorer']);
  });

  it('휴지통 아이콘을 더블클릭해도 아직 창을 열지 않는다', async () => {
    render(<DesktopIconsLayer />);
    await userEvent.dblClick(screen.getByText('휴지통'));
    expect(useWindowStore.getState().order).toHaveLength(0);
  });
});
