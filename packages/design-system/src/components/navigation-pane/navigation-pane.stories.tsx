import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { NavigationPane } from './navigation-pane';

const meta = {
  title: 'Components/NavigationPane',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 항목을 items 슬롯(children)에 채운다 */
export const Default: Story = {
  render: () => (
    <NavigationPane>
      <span>항목</span>
    </NavigationPane>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('항목')).toBeInTheDocument();
  },
};
