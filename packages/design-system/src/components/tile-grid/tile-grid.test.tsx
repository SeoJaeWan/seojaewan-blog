import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TileGrid } from './tile-grid';

// @codocs [[컴포넌트 목록:기본 컨트롤]]
describe('TileGrid', () => {
  it('기본은 start 정렬이고 바깥 틀을 잘라 낸다', () => {
    render(
      <TileGrid data-testid="grid">
        <span>타일</span>
      </TileGrid>,
    );
    const grid = screen.getByTestId('grid');
    expect(grid).toHaveClass('overflow-clip');
    expect(screen.getByText('타일').parentElement).toHaveClass('flex-wrap');
    expect(screen.getByText('타일').parentElement).not.toHaveClass('justify-center');
  });

  it('center는 타일 줄을 가운데에 모으고 바깥 틀을 자르지 않는다', () => {
    render(
      <TileGrid align="center" data-testid="grid">
        <span>타일</span>
      </TileGrid>,
    );
    expect(screen.getByTestId('grid')).not.toHaveClass('overflow-clip');
    expect(screen.getByText('타일').parentElement).toHaveClass('justify-center');
  });
});
