import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { BrowserToolbar } from './browser-toolbar';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('BrowserToolbar', () => {
  it('뒤로·앞으로·새로고침·더보기 버튼과 주소 입력창을 그린다', () => {
    render(<BrowserToolbar />);
    expect(screen.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '앞으로' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '새로고침' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '더보기' })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '주소' })).toHaveValue('웹 주소');
  });

  it('버튼을 누르면 각 동작을 부른다', async () => {
    const user = userEvent.setup();
    const handleBack = vi.fn();
    const handleForward = vi.fn();
    const handleRefresh = vi.fn();
    const handleMenu = vi.fn();
    render(
      <BrowserToolbar
        onBack={handleBack}
        onForward={handleForward}
        onRefresh={handleRefresh}
        onMenu={handleMenu}
      />,
    );

    await user.click(screen.getByRole('button', { name: '뒤로' }));
    await user.click(screen.getByRole('button', { name: '앞으로' }));
    await user.click(screen.getByRole('button', { name: '새로고침' }));
    await user.click(screen.getByRole('button', { name: '더보기' }));

    expect(handleBack).toHaveBeenCalledTimes(1);
    expect(handleForward).toHaveBeenCalledTimes(1);
    expect(handleRefresh).toHaveBeenCalledTimes(1);
    expect(handleMenu).toHaveBeenCalledTimes(1);
  });

  it('주소를 입력하면 onUrlChange를 부르고, url로 처음 값을 정한다', async () => {
    const user = userEvent.setup();
    const handleUrlChange = vi.fn();
    render(<BrowserToolbar url="example.com" onUrlChange={handleUrlChange} />);

    const input = screen.getByRole('textbox', { name: '주소' });
    expect(input).toHaveValue('example.com');
    await user.type(input, '/a');

    // 포커스를 받으면 주소 전체가 선택되므로 입력한 글자가 처음 값을 대신한다.
    expect(handleUrlChange.mock.lastCall?.[0]).toBe('/a');
  });
});
