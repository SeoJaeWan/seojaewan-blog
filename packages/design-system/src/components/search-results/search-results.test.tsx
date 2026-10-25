import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SearchResults } from './search-results';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SearchResults', () => {
  it('데스크톱은 결과 슬롯과 카드를 나란히 그린다', () => {
    render(
      <SearchResults icon={<span>아이콘</span>} actions={<button type="button">열기</button>}>
        <span>결과</span>
      </SearchResults>,
    );
    expect(screen.getByText('결과')).toBeInTheDocument();
    expect(screen.getByText('제목')).toBeInTheDocument();
    expect(screen.getByText('아이콘')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '열기' })).toBeInTheDocument();
    expect(screen.getByText('결과').parentElement).toHaveClass('w-300');
  });

  it('title과 meta를 카드로 넘긴다', () => {
    render(<SearchResults icon={null} title="글" meta="블로그" />);
    expect(screen.getByText('글')).toBeInTheDocument();
    expect(screen.getByText('블로그')).toBeInTheDocument();
  });

  it('모바일은 카드 아래에 결과를 그리고 스크롤바를 겹친다', () => {
    const { container } = render(
      <SearchResults device="mobile" icon={null} data-testid="root">
        <span>결과</span>
      </SearchResults>,
    );
    expect(screen.getByText('결과')).toBeInTheDocument();
    expect(container.querySelector('[aria-hidden="true"]')).toHaveClass('right-2');
    expect(screen.getByTestId('root')).toHaveClass('relative');
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<SearchResults icon={null} className="mt-8" data-testid="root" />);
    expect(screen.getByTestId('root')).toHaveClass('mt-8');
  });
});
