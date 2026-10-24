import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CodeBlock } from './code-block';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('CodeBlock', () => {
  it('언어와 코드를 그린다', () => {
    render(<CodeBlock language="ts" code="const a = 1;" />);
    expect(screen.getByText('ts')).toBeInTheDocument();
    expect(screen.getByText('const a = 1;')).toBeInTheDocument();
  });

  it('복사 단추를 누르면 코드를 클립보드에 쓴다', async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    render(<CodeBlock language="ts" code="const a = 1;" />);
    await user.click(screen.getByRole('button', { name: '코드 복사' }));
    expect(writeText).toHaveBeenCalledWith('const a = 1;');
  });
});
