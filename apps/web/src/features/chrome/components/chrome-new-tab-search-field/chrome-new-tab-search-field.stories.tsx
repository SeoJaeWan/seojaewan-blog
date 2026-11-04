import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import type { AddressSuggestionTarget } from '@/features/chrome/utils/chrome-address/chrome-address';

import { ChromeNewTabSearchField } from './chrome-new-tab-search-field';

// 피그마 Chrome/NewTabSearch 설명 `@runtime 입력하면 Flyout이 열린다`의 입력 글자와 추천 목록이다.
const QUERY = '리액트';
const suggestions = [
  {
    kind: 'post',
    title: '리액트 19 훅 정리',
    url: 'seojaewan.com/posts/react-19-hooks',
    page: { kind: 'post', slug: 'react-19-hooks' },
  },
  {
    kind: 'post',
    title: '리액트 서버 컴포넌트 이해하기',
    url: 'seojaewan.com/posts/react-server-components',
    page: { kind: 'post', slug: 'react-server-components' },
  },
  { kind: 'search', title: '리액트 검색', page: { kind: 'search', query: QUERY } },
] as const satisfies readonly AddressSuggestionTarget[];

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 동작 스토리다. 피그마 조립 Chrome/NewTabSearch의 `@runtime 입력하면 Flyout이 열린다` 줄을 확인한다.
const meta = {
  title: 'Behavior/Chrome/ChromeNewTabSearchField',
  component: ChromeNewTabSearchField,
  parameters: { layout: 'padded' },
  args: {
    getSuggestions: () => suggestions,
    onSuggestionOpen: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof ChromeNewTabSearchField>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[Chrome:새 탭 페이지]]
/** 입력하면 추천 목록(Flyout)이 열리고 항목을 보인다. 추천을 고르면 그 글을 연다 */
export const Opens: Story = {
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: '글 검색 또는 URL 입력' });

    await step('입력하기 전에는 추천 목록이 닫혀 있다', async () => {
      await expect(canvas.queryByRole('listbox', { name: '추천' })).not.toBeInTheDocument();
    });

    await step('입력하면 추천 목록이 열리고 항목을 보인다', async () => {
      await userEvent.type(input, QUERY);
      await expect(canvas.getByRole('listbox', { name: '추천' })).toBeVisible();
      await expect(canvas.getAllByRole('option')).toHaveLength(suggestions.length);
      for (const suggestion of suggestions) {
        await expect(canvas.getByRole('option', { name: suggestion.title })).toBeVisible();
      }
    });

    await step('추천을 고르면 그 글을 열고 목록이 닫힌다', async () => {
      await userEvent.click(canvas.getByRole('option', { name: '리액트 19 훅 정리' }));
      await expect(args.onSuggestionOpen).toHaveBeenCalledWith(suggestions[0]);
      await expect(canvas.queryByRole('listbox', { name: '추천' })).not.toBeInTheDocument();
    });
  },
};
