import { render, screen } from '@testing-library/react';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { SearchResults } from './search-results';

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
describe('SearchResults', () => {
  // 모바일은 ScrollArea를 쓰는데 jsdom에는 ResizeObserver가 없다. 크기를 바꾸지 않는 테스트라 아무것도 하지 않는 것으로 둔다.
  beforeAll(() => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(): void {}
        disconnect(): void {}
      },
    );
  });
  afterAll(() => {
    vi.unstubAllGlobals();
  });

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

  it('모바일은 카드 아래에 결과를 그리고 ScrollArea로 감싼다', () => {
    render(
      <SearchResults device="mobile" icon={null} data-testid="root">
        <span>결과</span>
      </SearchResults>,
    );
    expect(screen.getByText('결과')).toBeInTheDocument();
    // 결과 묶음 사이 간격은 데스크톱과 같은 2다.
    expect(screen.getByText('결과').parentElement).toHaveClass('gap-2');
    // 내용이 넘치지 않으면 스크롤바는 보이지 않는다(자리만 남는다).
    expect(screen.getByTestId('root').querySelector('[aria-hidden="true"]')).toHaveClass(
      'invisible',
    );
    expect(screen.getByTestId('root')).toHaveClass('overflow-hidden');
  });

  it('className으로 바깥 배치를 더한다', () => {
    render(<SearchResults icon={null} className="mt-8" data-testid="root" />);
    expect(screen.getByTestId('root')).toHaveClass('mt-8');
  });
});
