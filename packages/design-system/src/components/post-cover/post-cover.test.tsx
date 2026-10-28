import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PostCover } from './post-cover';

// @codocs [[Chrome:Notion 블록]]
describe('PostCover', () => {
  it('image를 그린다', () => {
    render(<PostCover image={<img alt="표지" src="a.png" />} />);
    expect(screen.getByAltText('표지')).toBeInTheDocument();
  });

  it('className을 바깥 배치로 이어 붙인다', () => {
    const { container } = render(<PostCover className="w-720" image={<img alt="" />} />);
    expect(container.firstElementChild).toHaveClass('h-240', 'w-720');
  });
});
