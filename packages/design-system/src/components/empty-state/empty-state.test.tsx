import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { EmptyState } from './empty-state';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('EmptyState', () => {
  it('제목, 메시지, 오류 코드를 그린다', () => {
    render(
      <EmptyState heading="페이지를 찾을 수 없다" message="주소를 확인해 주세요" code="404" />,
    );
    expect(screen.getByRole('heading', { name: '페이지를 찾을 수 없다' })).toBeInTheDocument();
    expect(screen.getByText('주소를 확인해 주세요')).toBeInTheDocument();
    expect(screen.getByText('404')).toBeInTheDocument();
  });

  it('새로고침 버튼을 누르면 onReload를 부른다', async () => {
    const user = userEvent.setup();
    const handleReload = vi.fn();
    render(
      <EmptyState heading="제목" message="메시지 내용" code="오류 코드" onReload={handleReload} />,
    );
    await user.click(screen.getByRole('button', { name: '새로고침' }));
    expect(handleReload).toHaveBeenCalledTimes(1);
  });

  it('showButton=false면 버튼을 그리지 않는다', () => {
    render(<EmptyState heading="제목" message="메시지 내용" code="오류 코드" showButton={false} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('id 같은 div 속성을 바탕에 넘긴다', () => {
    const { container } = render(
      <EmptyState heading="제목" message="메시지 내용" code="오류 코드" id="empty" />,
    );
    expect(container.firstElementChild).toHaveAttribute('id', 'empty');
  });
});
