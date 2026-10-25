import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ProfileButton } from './profile-button';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
// @codocs [[디자인 시스템:아이콘 자리]]
describe('ProfileButton', () => {
  it('name을 글자로 보이고 기본은 피그마 기본 문구다', () => {
    render(<ProfileButton photo={<i />} />);
    expect(screen.getByRole('button', { name: '사용자 이름' })).toBeInTheDocument();
  });

  it('name을 바꾸면 그 글자를 보인다', () => {
    render(<ProfileButton photo={<i />} name="서재완" />);
    expect(screen.getByRole('button', { name: '서재완' })).toBeInTheDocument();
  });

  it('photo로 받은 사진을 그린다', () => {
    render(<ProfileButton photo={<i>사진</i>} />);
    expect(screen.getByText('사진')).toBeInTheDocument();
  });

  it('누르면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<ProfileButton photo={<i />} onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
