import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BestMatchCard } from './best-match-card';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('BestMatchCard', () => {
  it('제목과 부가 정보 기본값을 그리고 아이콘과 슬롯을 채운다', () => {
    render(
      <BestMatchCard icon={<span>아이콘</span>}>
        <button type="button">열기</button>
      </BestMatchCard>,
    );
    expect(screen.getByText('제목')).toBeInTheDocument();
    expect(screen.getByText('부가 정보')).toBeInTheDocument();
    expect(screen.getByText('아이콘')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '열기' })).toBeInTheDocument();
  });

  it('제목과 부가 정보를 바꾸고 구분선을 그린다', () => {
    render(<BestMatchCard icon={null} title="글" meta="블로그" />);
    expect(screen.getByText('글')).toBeInTheDocument();
    expect(screen.getByText('블로그')).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<BestMatchCard icon={null} className="mt-8" data-testid="card" />);
    expect(screen.getByTestId('card')).toHaveClass('w-258', 'mt-8');
  });
});
