import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ExplorerAddressRow } from './explorer-address-row';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('ExplorerAddressRow', () => {
  it('desktop은 이동 버튼 넷과 검색 상자, 경로 슬롯을 그린다', () => {
    render(
      <ExplorerAddressRow locationIcon={<span />}>
        <span>경로 칸</span>
      </ExplorerAddressRow>,
    );
    for (const name of ['뒤로', '앞으로', '위로', '새로 고침']) {
      expect(screen.getByRole('button', { name })).toBeInTheDocument();
    }
    expect(screen.getByRole('searchbox', { name: '검색' })).toBeInTheDocument();
    expect(screen.getByText('경로 칸')).toBeInTheDocument();
  });

  it('mobile은 뒤로 버튼과 검색 버튼만 그린다', () => {
    render(<ExplorerAddressRow device="mobile" locationIcon={<span />} />);
    expect(screen.getByRole('button', { name: '뒤로' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '검색' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '앞으로' })).not.toBeInTheDocument();
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
  });

  it('버튼을 누르면 맞는 동작을 부른다', async () => {
    const user = userEvent.setup();
    const handlers = { onBack: vi.fn(), onForward: vi.fn(), onUp: vi.fn(), onRefresh: vi.fn() };
    render(<ExplorerAddressRow locationIcon={<span />} {...handlers} />);
    await user.click(screen.getByRole('button', { name: '뒤로' }));
    await user.click(screen.getByRole('button', { name: '앞으로' }));
    await user.click(screen.getByRole('button', { name: '위로' }));
    await user.click(screen.getByRole('button', { name: '새로 고침' }));
    for (const handler of Object.values(handlers)) {
      expect(handler).toHaveBeenCalledTimes(1);
    }
  });

  it('비활성으로 둔 이동 버튼은 누를 수 없다', () => {
    render(<ExplorerAddressRow locationIcon={<span />} backDisabled forwardDisabled upDisabled />);
    for (const name of ['뒤로', '앞으로', '위로']) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    expect(screen.getByRole('button', { name: '새로 고침' })).toBeEnabled();
  });

  it('검색 입력과 mobile 검색 버튼을 알린다', async () => {
    const user = userEvent.setup();
    const handleSearchChange = vi.fn();
    const handleSearch = vi.fn();
    const { rerender } = render(
      <ExplorerAddressRow locationIcon={<span />} onSearchChange={handleSearchChange} />,
    );
    await user.type(screen.getByRole('searchbox'), 'ab');
    expect(handleSearchChange).toHaveBeenLastCalledWith('ab');

    rerender(
      <ExplorerAddressRow device="mobile" locationIcon={<span />} onSearch={handleSearch} />,
    );
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(handleSearch).toHaveBeenCalledTimes(1);
  });

  it('searchPlaceholder로 검색 상자의 안내 글자를 바꾼다', () => {
    render(<ExplorerAddressRow locationIcon={<span />} searchPlaceholder="Blog 검색" />);
    expect(screen.getByRole('searchbox', { name: '검색' })).toHaveAttribute(
      'placeholder',
      'Blog 검색',
    );
  });
});
