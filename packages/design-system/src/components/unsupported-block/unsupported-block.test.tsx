import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UnsupportedBlock } from './unsupported-block';

// @codocs [[Chrome:Notion 블록]]
describe('UnsupportedBlock', () => {
  it('유형 이름을 안내 글에 넣는다', () => {
    render(<UnsupportedBlock typeName="synced_block" />);
    expect(screen.getByText('지원하지 않는 블록(synced_block)')).toBeInTheDocument();
  });

  it('유형 이름이 없으면 자리 설명 글을 보여 준다', () => {
    render(<UnsupportedBlock />);
    expect(screen.getByText('지원하지 않는 블록(유형 이름)')).toBeInTheDocument();
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<UnsupportedBlock className="mt-8" data-testid="block" />);
    expect(screen.getByTestId('block')).toHaveClass('mt-8');
  });
});
