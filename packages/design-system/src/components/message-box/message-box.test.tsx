import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MessageBox } from './message-box';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('MessageBox', () => {
  it('제목을 이름으로, 메시지를 설명으로 갖는 alertdialog다', () => {
    render(<MessageBox title="휴지통 비우기" message="모든 항목을 지울까요?" />);
    const dialog = screen.getByRole('alertdialog', { name: '휴지통 비우기' });
    expect(dialog).toHaveAccessibleDescription('모든 항목을 지울까요?');
  });

  it('buttons=one은 확인 버튼 하나만 그린다', () => {
    render(<MessageBox title="제목" message="메시지 내용" />);
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: '확인' })).toBeInTheDocument();
  });

  it('buttons=two는 확인과 취소 버튼을 그리고 누르면 각 핸들러를 부른다', async () => {
    const user = userEvent.setup();
    const handlePrimary = vi.fn();
    const handleSecondary = vi.fn();
    render(
      <MessageBox
        buttons="two"
        title="제목"
        message="메시지 내용"
        primaryLabel="비우기"
        onPrimaryClick={handlePrimary}
        onSecondaryClick={handleSecondary}
      />,
    );

    await user.click(screen.getByRole('button', { name: '비우기' }));
    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(handlePrimary).toHaveBeenCalledTimes(1);
    expect(handleSecondary).toHaveBeenCalledTimes(1);
  });

  it('id 같은 div 속성을 바탕에 넘긴다', () => {
    render(<MessageBox title="제목" message="메시지 내용" id="box" />);
    expect(screen.getByRole('alertdialog')).toHaveAttribute('id', 'box');
  });
});
