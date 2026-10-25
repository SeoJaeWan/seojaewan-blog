import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SnapLayoutOption } from './snap-layout-option';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SnapLayoutOption', () => {
  it.each([
    ['half', 2],
    ['twothirds', 2],
    ['halfquarter', 3],
    ['quad', 4],
  ] as const)('%s는 칸을 %i개 그린다', (layout, count) => {
    render(<SnapLayoutOption layout={layout} />);
    expect(screen.getAllByRole('button')).toHaveLength(count);
  });

  it('기본값은 half다', () => {
    render(<SnapLayoutOption />);
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('twothirds는 왼쪽 열이 고정 너비 56이다', () => {
    const { container } = render(<SnapLayoutOption layout="twothirds" />);
    expect(container.firstElementChild?.firstElementChild).toHaveClass('w-56', 'shrink-0');
  });

  it('className을 루트에 덧붙인다', () => {
    const { container } = render(<SnapLayoutOption className="m-8" />);
    expect(container.firstElementChild).toHaveClass('m-8', 'w-88', 'h-56');
  });

  it.each([
    ['half', ['왼쪽 절반', '오른쪽 절반']],
    ['twothirds', ['왼쪽 3분의 2', '오른쪽 3분의 1']],
    ['halfquarter', ['왼쪽 절반', '오른쪽 위 4분의 1', '오른쪽 아래 4분의 1']],
    ['quad', ['왼쪽 위 4분의 1', '왼쪽 아래 4분의 1', '오른쪽 위 4분의 1', '오른쪽 아래 4분의 1']],
  ] as const)('%s의 칸은 칸 번호 순서로 접근성 이름을 갖는다', (layout, names) => {
    render(<SnapLayoutOption layout={layout} />);
    expect(screen.getAllByRole('button').map((b) => b.getAttribute('aria-label'))).toEqual(names);
  });

  it('칸을 누르면 칸 번호로 onSelectZone을 부른다', async () => {
    const user = userEvent.setup();
    const handleSelectZone = vi.fn();
    render(<SnapLayoutOption layout="halfquarter" onSelectZone={handleSelectZone} />);
    await user.click(screen.getByRole('button', { name: '오른쪽 아래 4분의 1' }));
    await user.click(screen.getByRole('button', { name: '왼쪽 절반' }));
    expect(handleSelectZone.mock.calls).toEqual([[2], [0]]);
  });
});
