import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Scrollbar } from './scrollbar';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('Scrollbar', () => {
  it('rest는 화살표 없이 막대만 그린다', () => {
    const { container } = render(<Scrollbar />);
    expect(container.querySelectorAll('svg')).toHaveLength(0);
  });

  it('expanded는 양 끝에 화살표를 그리고 재질 바탕을 고른다', () => {
    const { container } = render(<Scrollbar state="expanded" material="solid" />);
    expect(container.querySelectorAll('svg')).toHaveLength(2);
    expect(container.firstElementChild).toHaveClass('bg-material-fallback-acrylic-default');
  });

  it('막대의 위치와 길이를 방향에 맞춰 정한다', () => {
    const { container } = render(
      <Scrollbar orientation="horizontal" thumbOffset={12} thumbLength={30} />,
    );
    const thumb = container.firstElementChild?.querySelector(':scope > div');
    expect(thumb).toHaveStyle({ left: '12px', width: '30px' });
  });
});
