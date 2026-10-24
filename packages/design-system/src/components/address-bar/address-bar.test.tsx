import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AddressBar } from './address-bar';

/**
 * 입력창에서 선택된 글자를 돌려준다.
 * @param input 입력창
 * @returns 선택된 글자
 */
function selectedText(input: HTMLInputElement): string {
  return input.value.slice(input.selectionStart ?? 0, input.selectionEnd ?? 0);
}

// @codocs [[Chrome:주소창]]
describe('AddressBar', () => {
  it('평소에는 url을 보여 준다', () => {
    render(<AddressBar aria-label="주소" url="seojaewan.com/posts/react-19-hooks" />);
    expect(screen.getByRole('textbox', { name: '주소' })).toHaveValue(
      'seojaewan.com/posts/react-19-hooks',
    );
  });

  it('추천 목록이 열린 동안에는 query를 보여 준다', () => {
    render(<AddressBar aria-label="주소" url="seojaewan.com" query="리액트" suggesting />);
    expect(screen.getByRole('textbox', { name: '주소' })).toHaveValue('리액트');
  });

  it('클릭하면 주소 전체가 선택된다', async () => {
    const user = userEvent.setup();
    render(<AddressBar aria-label="주소" url="seojaewan.com" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '주소' });

    await user.click(input);

    expect(input).toHaveFocus();
    expect(selectedText(input)).toBe('seojaewan.com');
  });

  it('Tab으로 포커스를 받아도 주소 전체가 선택된다', async () => {
    const user = userEvent.setup();
    render(<AddressBar aria-label="주소" url="seojaewan.com" />);
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '주소' });

    await user.tab();

    expect(input).toHaveFocus();
    expect(selectedText(input)).toBe('seojaewan.com');
  });

  it('입력하면 onChange를 부른다', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<AddressBar aria-label="주소" url="" onChange={handleChange} />);

    await user.type(screen.getByRole('textbox', { name: '주소' }), '리액트');

    expect(screen.getByRole('textbox', { name: '주소' })).toHaveValue('리액트');
    expect(handleChange).toHaveBeenCalled();
  });
});
