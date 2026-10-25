import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RenameField } from './rename-field';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('RenameField', () => {
  it('처음 값은 이름이다', () => {
    render(<RenameField aria-label="이름 바꾸기" />);
    expect(screen.getByRole('textbox', { name: '이름 바꾸기' })).toHaveValue('이름');
  });

  it('마운트하면 포커스를 받고 이름 전체를 선택한다', () => {
    render(<RenameField aria-label="이름 바꾸기" text="문서" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '이름 바꾸기' });
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(0);
    expect(input.selectionEnd).toBe('문서'.length);
  });

  it('shouldSelectOnMount가 false면 포커스만 받고 선택하지 않는다', () => {
    render(<RenameField aria-label="이름 바꾸기" text="문서" shouldSelectOnMount={false} />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '이름 바꾸기' });
    expect(input).toHaveFocus();
    expect(input.selectionStart).toBe(input.selectionEnd);
  });

  it('입력하면 선택된 이름을 바꾸고 onChange를 부른다', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<RenameField aria-label="이름 바꾸기" text="문서" onChange={handleChange} />);
    const input = screen.getByRole('textbox', { name: '이름 바꾸기' });

    await user.keyboard('메모');

    expect(input).toHaveValue('메모');
    expect(handleChange).toHaveBeenCalled();
  });

  it('value, onKeyDown, ref를 input에 넘긴다', async () => {
    const user = userEvent.setup();
    const handleKeyDown = vi.fn();
    const ref = createRef<HTMLInputElement>();
    render(
      <RenameField
        ref={ref}
        aria-label="이름 바꾸기"
        value="고정"
        onChange={() => {}}
        onKeyDown={handleKeyDown}
      />,
    );
    const input = screen.getByRole('textbox', { name: '이름 바꾸기' });

    await user.keyboard('{Enter}');

    expect(input).toHaveValue('고정');
    expect(ref.current).toBe(input);
    expect(handleKeyDown).toHaveBeenCalledWith(expect.objectContaining({ key: 'Enter' }));
  });
});
