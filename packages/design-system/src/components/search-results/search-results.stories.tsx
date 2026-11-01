import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { SearchResults } from './search-results';

const meta = {
  title: 'Components/SearchResults',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 데스크톱은 결과 슬롯과 카드를 나란히 그리고, title·meta·icon·actions를 카드로 넘긴다 */
export const Default: Story = {
  render: () => (
    <div className="h-size-search-results-height w-size-shell-body-width">
      <SearchResults
        icon={<span>아이콘</span>}
        title="글"
        meta="블로그"
        actions={<button type="button">열기</button>}
      >
        <span>결과</span>
      </SearchResults>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('결과')).toBeInTheDocument();
    await expect(canvas.getByText('글')).toBeInTheDocument();
    await expect(canvas.getByText('블로그')).toBeInTheDocument();
    await expect(canvas.getByText('아이콘')).toBeInTheDocument();
    await expect(canvas.getByRole('button', { name: '열기' })).toBeInTheDocument();
  },
};

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 모바일은 카드 아래에 결과를 그리고 ScrollArea로 감싼다. 내용이 넘치지 않으면 스크롤바는 보이지 않는다 */
export const Mobile: Story = {
  render: () => (
    <div className="h-size-search-results-mobile-height w-size-shell-mobile-body-width">
      <SearchResults device="mobile" icon={null}>
        <span>결과</span>
      </SearchResults>
    </div>
  ),
  play: async ({ canvas, canvasElement }) => {
    await expect(canvas.getByText('결과')).toBeInTheDocument();
    await expect(canvasElement.querySelector('[data-state]')).not.toBeVisible();
  },
};
