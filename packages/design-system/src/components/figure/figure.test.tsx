import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Figure } from './figure';

// @codocs [[Chrome:Notion 블록]]
describe('Figure', () => {
  it('image와 기본 캡션을 그린다', () => {
    render(<Figure image={<img alt="그림" src="a.png" />} />);
    expect(screen.getByAltText('그림')).toBeInTheDocument();
    expect(screen.getByText('캡션')).toBeInTheDocument();
  });

  it('caption으로 받은 글을 그린다', () => {
    render(<Figure image={<img alt="" />} caption="설명" />);
    expect(screen.getByText('설명')).toBeInTheDocument();
  });

  it('showCaption이 false면 캡션을 그리지 않는다', () => {
    render(<Figure image={<img alt="" />} showCaption={false} />);
    expect(screen.queryByText('캡션')).not.toBeInTheDocument();
  });
});
