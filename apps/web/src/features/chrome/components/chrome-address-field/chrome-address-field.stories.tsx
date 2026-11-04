import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';

import { ChromeAddressField } from './chrome-address-field';
import { addressSuggestions } from './components/chrome-address-suggestions/story-data';

// @codocs [[테스트 작성 규칙:스토리 테스트]]
// 동작 스토리다. 피그마 조립 Chrome/AddressSuggestions의 `@runtime 입력하면 Flyout이 열린다` 줄을 확인한다.
const meta = {
  title: 'Behavior/Chrome/ChromeAddressField',
  component: ChromeAddressField,
  args: {
    address: 'seojaewan.com/posts/react-19-hooks',
    getSuggestions: () => addressSuggestions.items,
    onSuggestionOpen: fn(),
    onSubmit: fn(),
  },
} satisfies Meta<typeof ChromeAddressField>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[Chrome:주소창]]
/** 입력하면 추천 목록(Flyout)이 열리고 항목을 보인다. 추천을 고르면 그 글을 연다 */
export const Opens: Story = {
  play: async ({ canvasElement, args, step }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('combobox', { name: '주소 및 검색창' });

    await step('입력하기 전에는 추천 목록이 닫혀 있다', async () => {
      await expect(canvas.queryByRole('listbox', { name: '추천' })).not.toBeInTheDocument();
    });

    await step('입력하면 추천 목록이 열리고 항목을 보인다', async () => {
      await userEvent.type(input, addressSuggestions.query);
      await expect(canvas.getByRole('listbox', { name: '추천' })).toBeVisible();
      const options = canvas.getAllByRole('option');
      await expect(options).toHaveLength(addressSuggestions.items.length);
      for (const item of addressSuggestions.items) {
        await expect(canvas.getByRole('option', { name: new RegExp(item.title) })).toBeVisible();
      }
    });

    await step('추천을 고르면 그 글을 열고 목록이 닫힌다', async () => {
      await userEvent.click(canvas.getByRole('option', { name: /리액트 서버 컴포넌트 이해하기/ }));
      await expect(args.onSuggestionOpen).toHaveBeenCalledWith(addressSuggestions.items[1]);
      await expect(canvas.queryByRole('listbox', { name: '추천' })).not.toBeInTheDocument();
    });
  },
};
