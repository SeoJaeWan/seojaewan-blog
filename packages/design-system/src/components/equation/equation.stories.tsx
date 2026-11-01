import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect } from 'storybook/test';

import { Equation } from './equation';

const meta = {
  title: 'Components/Equation',
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

// @codocs [[디자인 시스템:컴포넌트 조립 규칙]]
/** 수식을 Formula 슬롯(children)에 채운다 */
export const Default: Story = {
  render: () => (
    <div className="w-size-post-width">
      <Equation>
        <span>x = 1</span>
      </Equation>
    </div>
  ),
  play: async ({ canvas }) => {
    await expect(canvas.getByText('x = 1')).toBeInTheDocument();
  },
};
