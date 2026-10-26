import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BrowserTab } from '../browser-tab/browser-tab';
import { BrowserTabStrip } from './browser-tab-strip';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('BrowserTabStrip', () => {
  it('Tabs 슬롯에 넣은 내용을 그린다', () => {
    render(
      <BrowserTabStrip>
        <div>탭 자리</div>
      </BrowserTabStrip>,
    );
    expect(screen.getByText('탭 자리')).toBeInTheDocument();
  });

  it('Tabs 슬롯의 탭 여럿을 가로로 나란히 놓는다', () => {
    render(
      <BrowserTabStrip>
        <BrowserTab favicon={null} title="첫째" />
        <BrowserTab favicon={null} title="둘째" />
      </BrowserTabStrip>,
    );
    const slot = screen.getByRole('tab', { name: /첫째/ }).parentElement;
    expect(slot).toHaveClass('flex');
    expect(slot).not.toHaveClass('flex-col');
  });

  it('새 탭 버튼을 누르면 onNewTab을 부른다', async () => {
    const user = userEvent.setup();
    const handleNewTab = vi.fn();
    render(<BrowserTabStrip onNewTab={handleNewTab} />);

    await user.click(screen.getByRole('button', { name: '새 탭' }));

    expect(handleNewTab).toHaveBeenCalledTimes(1);
  });

  it('className을 루트에 붙인다', () => {
    const { container } = render(<BrowserTabStrip className="w-240" />);
    expect(container.firstElementChild).toHaveClass('w-240');
  });
});
