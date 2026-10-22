import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { Button } from './button';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('Button', () => {
  it('글자를 접근성 이름으로 갖는 버튼이다', () => {
    render(<Button variant="accent">저장</Button>);
    expect(screen.getByRole('button', { name: '저장' })).toBeInTheDocument();
  });

  it('누르거나 키보드로 실행하면 onClick을 부른다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>저장</Button>);

    await user.tab();
    expect(screen.getByRole('button', { name: '저장' })).toHaveFocus();
    await user.keyboard('{Enter}');
    await user.click(screen.getByRole('button', { name: '저장' }));

    expect(handleClick).toHaveBeenCalledTimes(2);
  });

  it('disabled면 누를 수 없고 Tab 포커스도 받지 않는다', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(
      <Button disabled onClick={handleClick}>
        저장
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: '저장' }));
    await user.tab();

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '저장' })).not.toHaveFocus();
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('포커스 사각형은 보조 기술에 읽히지 않는다', () => {
    render(<Button>저장</Button>);
    expect(screen.getByRole('button')).toHaveAccessibleName('저장');
  });
});
