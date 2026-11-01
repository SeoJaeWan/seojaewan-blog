import type { Meta, StoryObj } from '@storybook/react-vite';
import type { ReactNode } from 'react';
import { expect, fn, userEvent, within } from 'storybook/test';

import { BrowserTabStrip } from './browser-tab-strip';

type StoryArgs = {
  /** Tabs 슬롯에 넣을 내용이다 */
  tabs: ReactNode;
  onNewTab?: () => void;
};

const meta = {
  title: 'Components/BrowserTabStrip',
  render: (args) => {
    const { onNewTab: handleNewTab } = args;
    return <BrowserTabStrip onNewTab={handleNewTab}>{args.tabs}</BrowserTabStrip>;
  },
} satisfies Meta<StoryArgs>;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
export const Default: Story = {
  args: { tabs: <span>탭 자리</span>, onNewTab: fn() },
  play: async ({ args, canvasElement, step }) => {
    const canvas = within(canvasElement);

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('Tabs 슬롯에 넣은 내용을 그린다', async () => {
      await expect(canvas.getByText('탭 자리')).toBeInTheDocument();
    });

    // @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
    await step('새 탭 버튼을 누르면 onNewTab을 부른다', async () => {
      await userEvent.click(canvas.getByRole('button', { name: '새 탭' }));
      await expect(args.onNewTab).toHaveBeenCalledTimes(1);
    });
  },
};
