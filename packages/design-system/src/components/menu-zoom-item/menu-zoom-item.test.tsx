import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MenuZoomItem } from './menu-zoom-item';

// @codocs [[Chrome:확대/축소]]
describe('MenuZoomItem', () => {
  it('배율 글자를 보여 주고 −·+ 버튼이 콜백을 부른다', async () => {
    const user = userEvent.setup();
    const handleZoomOut = vi.fn();
    const handleZoomIn = vi.fn();
    render(<MenuZoomItem value="110%" onZoomOut={handleZoomOut} onZoomIn={handleZoomIn} />);

    expect(screen.getByText('110%')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '축소' }));
    await user.click(screen.getByRole('button', { name: '확대' }));

    expect(handleZoomOut).toHaveBeenCalledTimes(1);
    expect(handleZoomIn).toHaveBeenCalledTimes(1);
  });

  it('끝 단계에서는 해당 버튼이 비활성이다', () => {
    render(<MenuZoomItem value="200%" isZoomInDisabled />);

    expect(screen.getByRole('button', { name: '확대' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '축소' })).toBeEnabled();
  });
});
