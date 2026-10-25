import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { WindowPreview } from './window-preview';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
describe('WindowPreview', () => {
  it('appIcon과 title을 머리글에 그린다', () => {
    render(<WindowPreview appIcon={<i>앱</i>} title="문서" />);
    expect(screen.getByText('앱')).toBeInTheDocument();
    expect(screen.getByText('문서')).toBeInTheDocument();
  });

  it('thumbnail 자리에 받은 내용을 그린다', () => {
    render(<WindowPreview appIcon={<i />} thumbnail={<p>축소 화면</p>} />);
    expect(screen.getByText('축소 화면')).toBeInTheDocument();
  });

  it('닫기 버튼은 onClose만 부르고 카드의 onClick은 부르지 않는다', async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();
    const handleClick = vi.fn();
    render(<WindowPreview appIcon={<i />} onClose={handleClose} onClick={handleClick} />);

    await user.click(screen.getByRole('button', { name: '창 닫기', hidden: true }));

    expect(handleClose).toHaveBeenCalledTimes(1);
    expect(handleClick).not.toHaveBeenCalled();
  });
});
