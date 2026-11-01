import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Quote } from './quote';

const meta = {
  title: 'Components/Quote',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 인용 글을 슬롯(children)에 채운다 */
export const Default: Story = {
  render: () => (
    <Quote>
      <p>인용 글</p>
    </Quote>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('인용 글')).toBeInTheDocument();
  },
};
