import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { type ReactNode, useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { MessageBoxDialog } from './message-box-dialog';

const TITLE = '휴지통 비우기';
const MESSAGE = '소중한 글이에요 지우지 말아주세요';

/**
 * 버튼으로 메시지 상자를 여는 화면을 그린다.
 * @param props
 * @param props.onPrimaryClick 확인 버튼 핸들러
 */
function Opener(props: { onPrimaryClick?: () => void }): ReactNode {
  const [isOpen, setIsOpen] = useState(false);

  /** 메시지 상자를 연다. */
  function handleOpenClick(): void {
    setIsOpen(true);
  }

  /**
   * 메시지 상자가 알린 열림 여부를 따른다.
   * @param isNextOpen 바뀐 열림 여부
   */
  function handleOpenChange(isNextOpen: boolean): void {
    setIsOpen(isNextOpen);
  }

  return (
    <>
      <button type="button" onClick={handleOpenClick}>
        열기
      </button>
      <MessageBoxDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={TITLE}
        message={MESSAGE}
        onPrimaryClick={props.onPrimaryClick}
      />
    </>
  );
}

// @codocs [[작업 공간:휴지통]]
describe('MessageBoxDialog', () => {
  it('열면 제목을 이름으로, 메시지를 설명으로 갖는 alertdialog가 뜬다', async () => {
    const user = userEvent.setup();
    render(<Opener />);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '열기' }));

    const dialog = screen.getByRole('alertdialog', { name: TITLE });
    expect(dialog).toHaveAccessibleDescription(MESSAGE);
    expect(dialog).toHaveClass('motion-flyout-enter');
  });

  it('확인 버튼을 누르면 핸들러를 부르고 닫힌다', async () => {
    const user = userEvent.setup();
    const handlePrimaryClick = vi.fn();
    render(<Opener onPrimaryClick={handlePrimaryClick} />);
    await user.click(screen.getByRole('button', { name: '열기' }));

    await user.click(screen.getByRole('button', { name: '확인' }));

    expect(handlePrimaryClick).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('Esc를 누르면 닫힌다', async () => {
    const user = userEvent.setup();
    render(<Opener />);
    await user.click(screen.getByRole('button', { name: '열기' }));

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });

  it('buttons=two의 취소 버튼도 닫는다', async () => {
    const user = userEvent.setup();
    render(<MessageBoxDialog defaultOpen buttons="two" title={TITLE} message={MESSAGE} />);

    await user.click(screen.getByRole('button', { name: '취소' }));

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
  });
});
