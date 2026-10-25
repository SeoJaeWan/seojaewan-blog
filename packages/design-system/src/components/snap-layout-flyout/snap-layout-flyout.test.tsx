import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SnapLayoutFlyout } from './snap-layout-flyout';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SnapLayoutFlyout', () => {
  it('레이아웃 넷(칸 2+2+3+4개)을 그린다', () => {
    render(<SnapLayoutFlyout />);
    expect(screen.getAllByRole('button')).toHaveLength(11);
  });

  it('className을 루트에 덧붙인다', () => {
    const { container } = render(<SnapLayoutFlyout className="m-8" />);
    expect(container.firstElementChild).toHaveClass('m-8', 'p-12', 'gap-12');
  });

  it('칸을 누르면 레이아웃과 칸 번호로 onSelectZone을 부른다', async () => {
    const user = userEvent.setup();
    const handleSelectZone = vi.fn();
    render(<SnapLayoutFlyout onSelectZone={handleSelectZone} />);
    const buttons = screen.getAllByRole('button');
    // 순서: half 2칸, twothirds 2칸, halfquarter 3칸, quad 4칸
    await user.click(buttons[1] as HTMLElement);
    await user.click(buttons[2] as HTMLElement);
    await user.click(buttons[10] as HTMLElement);
    expect(handleSelectZone.mock.calls).toEqual([
      ['half', 1],
      ['twothirds', 0],
      ['quad', 3],
    ]);
  });
});
